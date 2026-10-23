// src/app/api/consultations/[id]/student-link/route.ts
// ─────────────────────────────────────────────────────────────────────
// PATCH /api/consultations/[id]/student-link — 홈페이지 상담을 기존 학생과 연결 (관리자 로그인 필요)
//
// [Stage 1] 홈페이지 상담(source = "homepage") 전용입니다. 관리자 등록 상담에는 사용할 수 없습니다.
//
// 요청 본문
//   { student_id: number | string, applicant_role: "student" | "guardian", guardian_id: number | string | null }
//   - applicant_role = "student"  → student_id 저장, guardian_id = null, counterpart_type = "student"
//   - applicant_role = "guardian" → student_id 저장, guardian_id 필수(그 학생과 student_guardians로 연결된 보호자만),
//                                    counterpart_type = "guardian"
//
// 변경하는 컬럼은 student_id / guardian_id / counterpart_type / updated_at 4개뿐입니다.
// 홈페이지 신청 원본(name, phone, email, message, source, age_group, program_code, duration_weeks, stay_option,
// preferred_start_date, english_level, cebu_month_stay, local_school_experience, locale, created_at)은 update에 넣지 않습니다.
//
// - 이미 학생이 연결된 상담은 다시 연결하지 않음 → 409 (해제는 아래 DELETE)
// - [Stage 4-B] 연결 변경: 본문에 mode: "change", expected_student_id, expected_guardian_id(화면에서 본 현재 연결)를 함께 보냄
//   → 이미 연결된 상담만, 현재 연결이 expected와 다르면 409, 같은 대상이면 저장하지 않음(unchanged: true),
//     조건부 저장(조회한 현재 연결이 그대로일 때만) + admin_logs(CHANGE_STUDENT_LINK)
//   학생·보호자·student_guardians는 변경하지 않음 (보호자는 선택한 학생과 연결된 기존 보호자만)
// - 하나의 트랜잭션: 확인 → 연결 저장 → admin_logs(LINK_STUDENT) 기록 (기록 실패 시 연결도 취소)
// ─────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { getAdminSessionFromRequest, adminUnauthorizedResponse } from "@/lib/adminApiAuth";
import type { Prisma } from "@/generated/prisma/client";
import { ConsultationRequestError, parseRecordId } from "@/lib/consultationRecords";
import { clientIp } from "@/lib/programPrices";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** 홈페이지 상담 신청으로 접수된 상담의 source 값 (POST /api/public/consultations가 저장) */
const HOMEPAGE_SOURCE = "homepage";

const APPLICANT_ROLES = ["student", "guardian"] as const;
type ApplicantRole = (typeof APPLICANT_ROLES)[number];

/** 숫자 id (숫자 또는 숫자 문자열) → BigInt. 비었거나 형식이 틀리면 null */
function toId(value: unknown): bigint | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? BigInt(value) : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return /^[1-9]\d{0,17}$/.test(trimmed) ? BigInt(trimmed) : null;
  }
  return null;
}

function fail(status: number, message: string, field?: string) {
  return NextResponse.json(
    field ? { success: false, message, errors: { [field]: message } } : { success: false, message },
    { status }
  );
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  const { id } = await params;
  const consultationId = parseRecordId(id);
  if (consultationId === null) return fail(400, "올바르지 않은 상담 ID입니다.");

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid body");
    body = parsed as Record<string, unknown>;
  } catch {
    return fail(400, "요청 형식이 올바르지 않습니다.");
  }

  // 1) 입력 검사
  const studentId = toId(body.student_id);
  if (studentId === null) return fail(400, "연결할 학생을 선택해 주세요.", "student_id");

  const role = body.applicant_role;
  if (typeof role !== "string" || !(APPLICANT_ROLES as readonly string[]).includes(role)) {
    return fail(400, "신청자 역할(학생 본인 / 보호자)을 선택해 주세요.", "applicant_role");
  }
  const applicantRole = role as ApplicantRole;

  let guardianId: bigint | null = null;
  if (applicantRole === "guardian") {
    guardianId = toId(body.guardian_id);
    if (guardianId === null) return fail(400, "신청자에 해당하는 보호자를 선택해 주세요.", "guardian_id");
  }
  // 학생 본인이면 guardian_id는 보내더라도 저장하지 않음 (null)

  // [Stage 4-B] 연결 변경: mode = "change" + 화면에서 본 현재 연결(expected_student_id / expected_guardian_id)
  //   - mode가 없으면 기존(Stage 1) 연결 동작 그대로: 미연결 상담만, 이미 연결되어 있으면 409
  //   - mode = "change"면 이미 연결된 상담만, 화면에서 본 연결과 현재 DB 연결이 다르면 409 (다른 관리자가 먼저 변경)
  const isChange = body.mode === "change";
  let expectedStudentId: bigint | null = null;
  let expectedGuardianId: bigint | null = null;
  if (isChange) {
    expectedStudentId = toId(body.expected_student_id);
    if (expectedStudentId === null) return fail(400, "현재 연결 정보가 올바르지 않습니다. 화면을 새로고침해 주세요.");
    if (body.expected_guardian_id !== null && body.expected_guardian_id !== undefined && body.expected_guardian_id !== "") {
      expectedGuardianId = toId(body.expected_guardian_id);
      if (expectedGuardianId === null) return fail(400, "현재 연결 정보가 올바르지 않습니다. 화면을 새로고침해 주세요.");
    }
  }

  const adminId = /^\d{1,18}$/.test(session.id) ? BigInt(session.id) : null;
  const ip = clientIp(request);

  try {
    const linked = await prisma.$transaction(async (tx) => {
      // 2) 상담 확인
      const current = await tx.consultations.findUnique({
        where: { id: consultationId },
        select: { id: true, source: true, student_id: true, guardian_id: true, counterpart_type: true },
      });
      if (!current) throw new ConsultationRequestError(404, "상담 기록을 찾을 수 없습니다.");

      // 3) 홈페이지 상담만
      if (current.source !== HOMEPAGE_SOURCE) {
        throw new ConsultationRequestError(400, "홈페이지에서 접수된 상담만 이 기능으로 학생을 연결할 수 있습니다.");
      }

      if (!isChange) {
        // 8) 이미 연결된 상담은 다시 연결하지 않음 (기존 동작)
        if (current.student_id !== null) {
          throw new ConsultationRequestError(409, "이미 학생이 연결된 상담입니다. 화면을 새로고침해 연결 상태를 확인해 주세요.");
        }
      } else if (current.student_id === null || current.student_id !== expectedStudentId || current.guardian_id !== expectedGuardianId) {
        // [Stage 4-B] 변경 대상 연결이 화면에서 본 연결과 다름 (해제·변경이 먼저 저장됨)
        throw new ConsultationRequestError(409, "상담 연결 상태가 그 사이에 변경되었습니다. 화면을 새로고침해 주세요.");
      }

      // 4) 학생 확인
      const student = await tx.students.findUnique({
        where: { id: studentId },
        select: { id: true },
      });
      if (!student) {
        throw new ConsultationRequestError(400, "선택한 학생을 찾을 수 없습니다. 학생을 다시 선택해 주세요.", "student_id");
      }

      // 6) 보호자: 선택한 학생과 실제로 연결된 보호자인지 (student_guardians)
      if (guardianId !== null) {
        const link = await tx.student_guardians.findFirst({
          where: { student_id: studentId, guardian_id: guardianId },
          select: { id: true },
        });
        if (!link) {
          throw new ConsultationRequestError(
            400,
            "선택한 보호자는 이 학생과 연결되어 있지 않습니다. 보호자를 다시 선택해 주세요.",
            "guardian_id"
          );
        }
      }

      const next = {
        student_id: studentId,
        guardian_id: guardianId,
        counterpart_type: applicantRole,
      };

      // [Stage 4-B] 현재 연결과 같은 학생 + 보호자 + 상담 대상이면 저장·기록하지 않음
      if (
        isChange &&
        current.student_id === next.student_id &&
        current.guardian_id === next.guardian_id &&
        current.counterpart_type === next.counterpart_type
      ) {
        return { ...next, unchanged: true };
      }

      // 5)·6)·7) 연결 관련 값만 저장
      //   - 연결: 같은 순간 다른 관리자가 먼저 연결한 경우를 막기 위해 student_id IS NULL 조건 포함
      //   - [Stage 4-B] 변경: 조회한 현재 연결(student_id / guardian_id / counterpart_type)이 그대로일 때만
      const result = await tx.consultations.updateMany({
        where: isChange
          ? {
              id: consultationId,
              source: HOMEPAGE_SOURCE,
              student_id: current.student_id,
              guardian_id: current.guardian_id,
              counterpart_type: current.counterpart_type,
            }
          : { id: consultationId, source: HOMEPAGE_SOURCE, student_id: null },
        data: { ...next, updated_at: new Date() },
      });
      if (result.count !== 1) {
        throw new ConsultationRequestError(
          409,
          isChange
            ? "상담 연결 상태가 그 사이에 변경되었습니다. 화면을 새로고침해 주세요."
            : "이미 학생이 연결된 상담입니다. 화면을 새로고침해 연결 상태를 확인해 주세요."
        );
      }

      // 10) 연결 기록 (기존 admin_logs 구조 그대로) — 연결: LINK_STUDENT / [Stage 4-B] 변경: CHANGE_STUDENT_LINK
      await tx.admin_logs.create({
        data: {
          admin_user_id: adminId,
          action: isChange ? "CHANGE_STUDENT_LINK" : "LINK_STUDENT",
          table_name: "consultations",
          record_id: current.id,
          old_data: serializeBigInt({
            consultation_id: current.id,
            student_id: current.student_id,
            guardian_id: current.guardian_id,
            counterpart_type: current.counterpart_type,
          }) as unknown as Prisma.InputJsonValue,
          new_data: serializeBigInt({
            consultation_id: current.id,
            ...next,
            applicant_role: applicantRole,
          }) as unknown as Prisma.InputJsonValue,
          ip_address: ip,
        },
      });

      return { ...next, unchanged: false };
    });

    return NextResponse.json({
      success: true,
      message: linked.unchanged
        ? "현재 연결과 동일합니다. 변경하지 않았습니다."
        : isChange
          ? "상담 연결이 변경되었습니다."
          : "학생이 연결되었습니다.",
      unchanged: linked.unchanged,
      link: serializeBigInt({ consultation_id: consultationId, ...linked }),
    });
  } catch (error) {
    if (error instanceof ConsultationRequestError) {
      return fail(error.status, error.message, error.field);
    }

    console.error("상담 학생 연결 오류:", error);

    return fail(500, "학생 연결에 실패했습니다.");
  }
}

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/consultations/[id]/student-link — [Stage 4-A] 홈페이지 상담의 학생·보호자 연결 해제 (관리자 로그인 필요)
//
// - 홈페이지 상담(source = "homepage")만 허용 (아니면 400), 상담이 없으면 404
// - 이미 미연결(student_id IS NULL)이면 409 — 다시 호출해도 성공으로 처리하지 않음
// - 상담에서 student_id = NULL, guardian_id = NULL, counterpart_type = "student", updated_at 4개 값만 변경
//   홈페이지 신청 원본(name, phone, email, message, source, age_group, program_code, duration_weeks, stay_option,
//   preferred_start_date, english_level, cebu_month_stay, local_school_experience, locale, created_at)은 변경하지 않음
// - students / guardians / student_guardians는 조회·수정·삭제하지 않음 (학생·보호자·학생-보호자 관계 그대로 유지)
// - 하나의 트랜잭션: 상담 조회 → 확인 → 조건부 해제(조회한 연결 상태와 같을 때만) → admin_logs(UNLINK_STUDENT)
//   그 사이 다른 관리자가 연결 상태를 바꿨으면 해제 0건 → 409, 전체 취소
// ─────────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  const { id } = await params;
  const consultationId = parseRecordId(id);
  if (consultationId === null) return fail(400, "올바르지 않은 상담 ID입니다.");

  const adminId = /^\d{1,18}$/.test(session.id) ? BigInt(session.id) : null;
  const ip = clientIp(request);

  try {
    await prisma.$transaction(async (tx) => {
      // 1) 상담 조회
      const current = await tx.consultations.findUnique({
        where: { id: consultationId },
        select: { id: true, source: true, student_id: true, guardian_id: true, counterpart_type: true },
      });
      if (!current) throw new ConsultationRequestError(404, "상담 기록을 찾을 수 없습니다.");

      // 2) 홈페이지 상담만
      if (current.source !== HOMEPAGE_SOURCE) {
        throw new ConsultationRequestError(400, "홈페이지에서 접수된 상담만 연결을 해제할 수 있습니다.");
      }

      // 3) 현재 연결 상태 확인 — 이미 미연결이면 성공 처리하지 않음
      if (current.student_id === null) {
        throw new ConsultationRequestError(409, "이미 학생이 연결되지 않은 상담입니다. 화면을 새로고침해 연결 상태를 확인해 주세요.");
      }

      const next = { student_id: null, guardian_id: null, counterpart_type: "student" };

      // 4) 조건부 해제: 조회한 연결 상태(student_id / guardian_id / counterpart_type)가 그대로일 때만
      const result = await tx.consultations.updateMany({
        where: {
          id: consultationId,
          source: HOMEPAGE_SOURCE,
          student_id: current.student_id,
          guardian_id: current.guardian_id,
          counterpart_type: current.counterpart_type,
        },
        data: { ...next, updated_at: new Date() },
      });
      if (result.count !== 1) {
        throw new ConsultationRequestError(409, "상담 연결 상태가 그 사이에 변경되었습니다. 화면을 새로고침해 주세요.");
      }

      // 5) 해제 기록 (기존 admin_logs 구조 그대로)
      await tx.admin_logs.create({
        data: {
          admin_user_id: adminId,
          action: "UNLINK_STUDENT",
          table_name: "consultations",
          record_id: current.id,
          old_data: serializeBigInt({
            consultation_id: current.id,
            student_id: current.student_id,
            guardian_id: current.guardian_id,
            counterpart_type: current.counterpart_type,
          }) as unknown as Prisma.InputJsonValue,
          new_data: serializeBigInt({
            consultation_id: current.id,
            ...next,
          }) as unknown as Prisma.InputJsonValue,
          ip_address: ip,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "학생·보호자 연결이 해제되었습니다.",
    });
  } catch (error) {
    if (error instanceof ConsultationRequestError) {
      return fail(error.status, error.message);
    }

    console.error("상담 학생 연결 해제 오류:", error);

    return fail(500, "연결 해제에 실패했습니다.");
  }
}
