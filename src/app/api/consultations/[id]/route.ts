import { isIP } from "node:net";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { getAdminSessionFromRequest, adminUnauthorizedResponse } from "@/lib/adminApiAuth";
import type { Prisma } from "@/generated/prisma/client";
import { validateConsultationInput, type ConsultationInput } from "@/lib/consultationValidation";
import {
  CONSULTATION_INCLUDE,
  ConsultationRequestError,
  consultationColumns,
  parseRecordId,
  resolveConsultationRefs,
  validationErrorBody,
} from "@/lib/consultationRecords";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** 홈페이지 상담 신청으로 접수된 상담의 source 값 (POST /api/public/consultations가 저장) */
const HOMEPAGE_SOURCE = "homepage";

/** 상담 기록 삭제가 허용되는 역할 (roles.code) */
const DELETE_ROLE = "SUPER_ADMIN";

function invalidIdResponse() {
  return NextResponse.json(
    {
      success: false,
      message: "올바르지 않은 상담 ID입니다.",
    },
    { status: 400 }
  );
}

function notFoundResponse() {
  return NextResponse.json(
    {
      success: false,
      message: "상담 기록을 찾을 수 없습니다.",
    },
    { status: 404 }
  );
}

function isRecordNotFound(error: unknown) {
  return !!error && typeof error === "object" && (error as { code?: unknown }).code === "P2025";
}

/** admin_logs.ip_address(inet)에 넣을 수 있는 IP만 (형식이 다르면 null) */
function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = forwarded || request.headers.get("x-real-ip")?.trim() || "";
  return candidate && isIP(candidate) ? candidate : null;
}

/**
 * 상담의 program_code → programs.name (GET 응답 표시용)
 * - consultations.program_code는 DB FK만 있고 Prisma relation이 없어 include로 가져올 수 없음
 * - 조회에 실패해도 상담 상세는 보여 줘야 하므로 오류는 로그만 남기고 null(→ 화면에서 코드 표시)
 */
async function loadProgramName(code: string | null): Promise<string | null> {
  if (!code) return null;
  try {
    const program = await prisma.programs.findUnique({ where: { code }, select: { name: true } });
    return program?.name || null;
  } catch (error) {
    console.error("상담 상세 프로그램명 조회 오류:", error);
    return null;
  }
}

// GET /api/consultations/[id] 상담 상세 (관리자 로그인 필요)
// 응답에 program_name(programs.name, 없으면 null)을 붙임
export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  const { id } = await params;
  const consultationId = parseRecordId(id);
  if (consultationId === null) return invalidIdResponse();

  try {
    const consultation = await prisma.consultations.findUnique({
      where: { id: consultationId },
      include: CONSULTATION_INCLUDE,
    });
    if (!consultation) return notFoundResponse();

    const programName = await loadProgramName(consultation.program_code);

    return NextResponse.json({
      success: true,
      consultation: { ...serializeBigInt(consultation), program_name: programName },
    });
  } catch (error) {
    console.error("상담 상세 조회 오류:", error);

    return NextResponse.json(
      {
        success: false,
        message: "상담 기록을 불러오지 못했습니다.",
      },
      { status: 500 }
    );
  }
}

// PUT /api/consultations/[id] 상담 수정 (관리자 로그인 필요)
// 본문은 POST와 같습니다. 학생을 바꾸는 경우 보호자도 새 학생 기준으로 다시 확인합니다.
// assigned_admin_id를 보내지 않으면 담당자는 바꾸지 않고, 빈 값("")이면 미지정으로 바꿉니다.
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  const { id } = await params;
  const consultationId = parseRecordId(id);
  if (consultationId === null) return invalidIdResponse();

  let body: ConsultationInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "요청 형식이 올바르지 않습니다.",
      },
      { status: 400 }
    );
  }

  const { data, errors } = validateConsultationInput(body && typeof body === "object" ? body : {});
  if (Object.keys(errors).length > 0) {
    return NextResponse.json(validationErrorBody(errors), { status: 400 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.consultations.findUnique({
        where: { id: consultationId },
        select: { id: true, assigned_admin_id: true, source: true },
      });
      if (!current) throw new ConsultationRequestError(404, "상담 기록을 찾을 수 없습니다.");

      const assignedAdminId =
        data.assigned_admin_id === undefined
          ? current.assigned_admin_id?.toString() ?? null
          : data.assigned_admin_id;
      const refs = await resolveConsultationRefs(tx, data, assignedAdminId, current.assigned_admin_id);

      // [Stage 0] 홈페이지 상담 원본 보호
      // 홈페이지에서 접수된 상담(source = "homepage")은 신청자가 처음 입력한 정보를 그대로 보존합니다.
      // consultationColumns()는 name / phone / email을 학생·보호자 DB 정보로 채우고 message를 화면 입력값으로 채우므로,
      // 홈페이지 상담에서는 이 4개 값을 저장 대상에서 제외합니다. (요청 본문에 값이 있어도 무시)
      // source / age_group / program_code / duration_weeks / stay_option / preferred_start_date / english_level /
      // cebu_month_stay / local_school_experience / locale / created_at 은 consultationColumns()에 포함되지 않으므로
      // 이 PUT으로는 원래부터 변경되지 않습니다. (아래 update에는 consultationColumns() 결과 + updated_at만 들어감)
      // 관리자 등록 상담(source = NULL 등)은 기존과 동일하게 전체 컬럼을 저장합니다.
      const { name, phone, email, message, ...managedColumns } = consultationColumns(data, refs);
      const updateData =
        current.source === HOMEPAGE_SOURCE
          ? managedColumns
          : { ...managedColumns, name, phone, email, message };

      return tx.consultations.update({
        where: { id: consultationId },
        data: { ...updateData, updated_at: new Date() },
        select: { id: true },
      });
    });

    return NextResponse.json({
      success: true,
      message: "상담 기록이 수정되었습니다.",
      consultation: { id: updated.id.toString() },
    });
  } catch (error) {
    if (error instanceof ConsultationRequestError) {
      return NextResponse.json(
        error.field ? validationErrorBody({ [error.field]: error.message }) : { success: false, message: error.message },
        { status: error.status }
      );
    }
    if (isRecordNotFound(error)) return notFoundResponse();

    console.error("상담 수정 오류:", error);

    return NextResponse.json(
      {
        success: false,
        message: "상담 기록 수정에 실패했습니다.",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/consultations/[id] 상담 삭제 (SUPER_ADMIN만)
// - 권한은 로그인 정보(세션)만 믿지 않고 DB의 관리자 역할·활성 상태로 다시 확인
// - 삭제 전 내용을 기존 admin_logs 테이블에 기록하고 삭제 (하나의 트랜잭션: 기록 실패 시 삭제도 취소)
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  const { id } = await params;
  const consultationId = parseRecordId(id);
  if (consultationId === null) return invalidIdResponse();

  try {
    const adminId = /^\d{1,18}$/.test(session.id) ? BigInt(session.id) : null;
    const admin = adminId
      ? await prisma.admin_users.findUnique({
          where: { id: adminId },
          select: { id: true, is_active: true, roles: { select: { code: true } } },
        })
      : null;

    if (!admin || !admin.is_active || admin.roles.code !== DELETE_ROLE) {
      return NextResponse.json(
        {
          success: false,
          message: "상담 기록 삭제는 최고 관리자(SUPER_ADMIN)만 할 수 있습니다.",
        },
        { status: 403 }
      );
    }

    const ip = clientIp(request);

    await prisma.$transaction(async (tx) => {
      const record = await tx.consultations.findUnique({ where: { id: consultationId } });
      if (!record) throw new ConsultationRequestError(404, "상담 기록을 찾을 수 없습니다.");

      // [Stage 5-A] 홈페이지 상담은 원본 신청 기록 보호를 위해 삭제하지 않음
      // (admin_logs 기록·삭제 전에 중단 → 트랜잭션 취소, 기록도 남지 않음)
      if (record.source === HOMEPAGE_SOURCE) {
        throw new ConsultationRequestError(
          409,
          "홈페이지 상담 기록은 삭제할 수 없습니다. 상담 상태를 취소로 변경해 주세요."
        );
      }

      await tx.admin_logs.create({
        data: {
          admin_user_id: admin.id,
          action: "DELETE",
          table_name: "consultations",
          record_id: record.id,
          old_data: serializeBigInt(record) as unknown as Prisma.InputJsonValue,
          ip_address: ip,
        },
      });

      await tx.consultations.delete({ where: { id: consultationId } });
    });

    return NextResponse.json({
      success: true,
      message: "상담 기록이 삭제되었습니다.",
    });
  } catch (error) {
    if (error instanceof ConsultationRequestError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    if (isRecordNotFound(error)) return notFoundResponse();

    console.error("상담 삭제 오류:", error);

    return NextResponse.json(
      {
        success: false,
        message: "상담 기록 삭제에 실패했습니다.",
      },
      { status: 500 }
    );
  }
}
