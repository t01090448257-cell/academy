// src/app/api/consultations/[id]/applicant-guardian/route.ts
// ─────────────────────────────────────────────────────────────────────
// POST /api/consultations/[id]/applicant-guardian — [Stage 3]
// 홈페이지 상담 신청자를 학생의 보호자로 등록(또는 기존 동일 보호자 사용)한 뒤 상담에 연결 (관리자 로그인 필요)
//
// 요청 본문: { student_id: number | string }  ← 보호자 이름·전화·이메일은 받지 않음
//
// 대상 상담
//   - source = "homepage" 만 (아니면 400), 없으면 404
//   - guardian_id가 이미 있으면 409
//   - student_id가 NULL(학생 미연결)이면 요청한 student_id로 연결
//     student_id가 이미 있으면 요청한 student_id와 반드시 같아야 함 (다른 학생으로 바꿀 수 없음 → 400)
//
// 보호자 정보는 상담 원본(consultations.name / phone / email)에서만 가져옵니다.
//   - 저장 규칙은 학생 등록과 같은 validateStudentInput()으로 정리·검사 (공백 정리, 길이, 이메일 형식)
//   - relationship은 상담 데이터로 알 수 없으므로 NULL (추측하지 않음)
//
// 중복 방지
//   - 이 학생에게 이미 연결된 보호자 중 이름 + 전화번호 + 이메일이 같은 보호자가 있으면 새로 만들지 않고 그 보호자 사용
//     (이름·이메일: 대소문자 무시, 전화번호: 하이픈·공백 제외 — 학생 중복 검사와 같은 비교 방식)
//   - 이미 연결된 보호자를 쓰므로 student_guardians도 다시 만들지 않음 ((student_id, guardian_id) UNIQUE 존중)
//
// 새 보호자의 주 보호자(is_primary)
//   - 학생에게 보호자가 한 명도 없을 때만 true (학생 등록 화면의 "첫 보호자 = 주 보호자" 규칙)
//   - 보호자가 이미 있으면 false → 기존 주 보호자를 바꾸지 않음
//
// 하나의 트랜잭션: 상담 확인 → 학생 확인 → 동일 보호자 확인 → (보호자 생성 + student_guardians 연결)
//                  → 상담 연결(student_id / guardian_id / counterpart_type / updated_at만) → admin_logs
//   어느 단계든 실패하면 전체 취소. 홈페이지 신청 원본 컬럼은 update에 넣지 않습니다.
// ─────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { getAdminSessionFromRequest, adminUnauthorizedResponse } from "@/lib/adminApiAuth";
import type { Prisma } from "@/generated/prisma/client";
import { ConsultationRequestError, parseRecordId } from "@/lib/consultationRecords";
import { phoneForCompare, validateStudentInput } from "@/lib/studentValidation";
import { clientIp } from "@/lib/programPrices";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** 홈페이지 상담 신청으로 접수된 상담의 source 값 (POST /api/public/consultations가 저장) */
const HOMEPAGE_SOURCE = "homepage";

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

function fail(status: number, message: string) {
  return NextResponse.json({ success: false, message }, { status });
}

/** 대소문자 무시 비교 (둘 다 비어 있으면 같은 값으로 봄) */
function sameText(a: string | null, b: string | null): boolean {
  return (a ? a.trim().toLowerCase() : null) === (b ? b.trim().toLowerCase() : null);
}

export async function POST(request: NextRequest, { params }: RouteContext) {
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

  const studentId = toId(body.student_id);
  if (studentId === null) return fail(400, "학생을 선택해 주세요.");

  const adminId = /^\d{1,18}$/.test(session.id) ? BigInt(session.id) : null;
  const ip = clientIp(request);

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      // A. 상담 조회 및 검증
      const current = await tx.consultations.findUnique({
        where: { id: consultationId },
        select: {
          id: true,
          source: true,
          student_id: true,
          guardian_id: true,
          counterpart_type: true,
          name: true,
          phone: true,
          email: true,
        },
      });
      if (!current) throw new ConsultationRequestError(404, "상담 기록을 찾을 수 없습니다.");
      if (current.source !== HOMEPAGE_SOURCE) {
        throw new ConsultationRequestError(400, "홈페이지에서 접수된 상담만 이 기능을 사용할 수 있습니다.");
      }
      if (current.guardian_id !== null) {
        throw new ConsultationRequestError(409, "이미 보호자가 연결된 상담입니다. 화면을 새로고침해 연결 상태를 확인해 주세요.");
      }
      // 이미 학생이 연결된 상담은 그 학생에게만 보호자를 추가 (요청으로 다른 학생으로 바꿀 수 없음)
      if (current.student_id !== null && current.student_id !== studentId) {
        throw new ConsultationRequestError(400, "상담에 연결된 학생과 요청한 학생이 다릅니다. 화면을 새로고침해 주세요.");
      }

      // 신청자 원본 정보 → 보호자 값 (학생 등록과 같은 정리·검사 규칙)
      if (!current.name || !current.name.trim()) {
        throw new ConsultationRequestError(400, "상담 신청자 이름이 없어 보호자로 등록할 수 없습니다.");
      }
      const checked = validateStudentInput({
        name: "-",
        guardians: [{ name: current.name, phone: current.phone, email: current.email }],
      });
      const applicant = checked.data.guardians[0];
      if (!applicant || Object.keys(checked.errors).length > 0) {
        throw new ConsultationRequestError(
          400,
          `상담 신청자 정보를 보호자로 등록할 수 없습니다. (${Object.values(checked.errors)[0] ?? "신청자 이름 확인 필요"})`
        );
      }

      // B. 학생 존재 확인
      const student = await tx.students.findUnique({ where: { id: studentId }, select: { id: true } });
      if (!student) throw new ConsultationRequestError(404, "선택한 학생을 찾을 수 없습니다.");

      // C. 이 학생에게 이미 연결된 보호자 중 신청자와 같은 보호자
      const links = await tx.student_guardians.findMany({
        where: { student_id: studentId },
        select: {
          guardian_id: true,
          is_primary: true,
          guardians: { select: { name: true, phone: true, email: true } },
        },
        orderBy: [{ is_primary: "desc" }, { id: "asc" }],
      });
      const applicantPhone = phoneForCompare(applicant.phone);
      const existing = links.find(
        (link: { guardians: { name: string; phone: string | null; email: string | null } }) =>
          sameText(link.guardians.name, applicant.name) &&
          phoneForCompare(link.guardians.phone) === applicantPhone &&
          sameText(link.guardians.email, applicant.email)
      );

      let guardianId: bigint;
      let guardianCreated = false;
      if (existing) {
        // 동일 보호자가 이미 연결되어 있음 → 새로 만들지 않고, student_guardians도 다시 만들지 않음
        guardianId = existing.guardian_id;
      } else {
        // D. 보호자 생성 (관계는 알 수 없으므로 NULL)
        const created = await tx.guardians.create({
          data: {
            name: applicant.name,
            relationship: null,
            phone: applicant.phone,
            email: applicant.email,
          },
          select: { id: true },
        });
        guardianId = created.id;
        guardianCreated = true;

        // E. 학생-보호자 연결 (보호자가 없던 학생이면 첫 보호자 = 주 보호자, 있으면 기존 주 보호자 유지)
        await tx.student_guardians.create({
          data: {
            student_id: studentId,
            guardian_id: guardianId,
            is_primary: links.length === 0,
          },
        });
      }

      // F. 상담 연결 — 연결 관련 값만 변경. 같은 순간 다른 연결이 먼저 저장된 경우를 막기 위해 현재 상태를 조건에 포함
      const next = { student_id: studentId, guardian_id: guardianId, counterpart_type: "guardian" };
      const result = await tx.consultations.updateMany({
        where: { id: consultationId, source: HOMEPAGE_SOURCE, guardian_id: null, student_id: current.student_id },
        data: { ...next, updated_at: new Date() },
      });
      if (result.count !== 1) {
        throw new ConsultationRequestError(409, "상담 연결 상태가 그 사이에 변경되었습니다. 화면을 새로고침해 주세요.");
      }

      // 기록 (기존 admin_logs 구조 그대로)
      await tx.admin_logs.create({
        data: {
          admin_user_id: adminId,
          action: "ADD_APPLICANT_GUARDIAN",
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
            applicant_role: "guardian",
            guardian_created: guardianCreated,
            guardian_is_primary: existing ? existing.is_primary : links.length === 0,
          }) as unknown as Prisma.InputJsonValue,
          ip_address: ip,
        },
      });

      return { ...next, guardian_created: guardianCreated };
    });

    return NextResponse.json({
      success: true,
      message: outcome.guardian_created
        ? "신청자를 보호자로 등록하고 상담에 연결했습니다."
        : "이미 등록된 같은 보호자를 상담에 연결했습니다.",
      guardian_created: outcome.guardian_created,
      link: serializeBigInt({ consultation_id: consultationId, ...outcome }),
    });
  } catch (error) {
    if (error instanceof ConsultationRequestError) {
      return fail(error.status, error.message);
    }
    // (student_id, guardian_id) UNIQUE 충돌 등 동시 처리 — 트랜잭션 전체 취소됨
    if (error && typeof error === "object" && (error as { code?: unknown }).code === "P2002") {
      return fail(409, "같은 보호자 연결이 동시에 처리되었습니다. 화면을 새로고침해 주세요.");
    }

    console.error("상담 신청자 보호자 등록 오류:", error);

    return fail(500, "신청자를 보호자로 등록하지 못했습니다.");
  }
}
