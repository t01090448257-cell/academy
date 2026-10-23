// src/lib/consultationRecords.ts
// 상담 API(POST·PUT /api/consultations) 공용 서버 도우미
// - 학생·보호자·담당자 id를 DB에서 다시 확인 (화면에서 보낸 id를 그대로 믿지 않음)
// - 보호자는 "선택한 학생과 연결된(student_guardians) 보호자"만 허용
// - consultations.name / phone / email(필수·연락처 컬럼)은 상담 상대(학생 또는 보호자)의 DB 정보로 채움

import type { Prisma } from "@/generated/prisma/client";
import type { CleanConsultation } from "@/lib/consultationValidation";

/** 목록·상세 공통 조회 범위 (관리자 비밀번호 등 불필요한 컬럼은 조회하지 않음) */
export const CONSULTATION_INCLUDE = {
  students: {
    select: { id: true, student_no: true, name: true, name_en: true, birth_date: true, phone: true, email: true },
  },
  guardians: {
    select: { id: true, name: true, relationship: true, phone: true, email: true },
  },
  admin_users: {
    select: { id: true, name: true, username: true },
  },
} satisfies Prisma.consultationsInclude;

/** 요청 처리 중 정해진 응답을 돌려주기 위한 오류 (트랜잭션 안에서 던지면 전체 취소) */
export class ConsultationRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public field?: string
  ) {
    super(message);
  }
}

/** URL·요청의 id → BigInt (숫자가 아니면 null) */
export function parseRecordId(id: string): bigint | null {
  return /^\d{1,18}$/.test(id) ? BigInt(id) : null;
}

/** @db.Date 컬럼: 시간대 영향 없이 입력한 날짜 그대로 저장 */
export function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

type Tx = Prisma.TransactionClient;

interface ResolvedRefs {
  student_id: bigint;
  guardian_id: bigint | null;
  assigned_admin_id: bigint | null;
  /** consultations.name / phone / email 에 저장할 상담 상대 정보 */
  name: string;
  phone: string | null;
  email: string | null;
}

/**
 * 학생·보호자·담당자 확인
 * @param assignedAdminId 저장할 담당자 id (null = 미지정)
 * @param keepAdminId 수정 시 기존 담당자 id — 비활성 관리자라도 기존 값 유지는 허용
 */
export async function resolveConsultationRefs(
  tx: Tx,
  data: CleanConsultation,
  assignedAdminId: string | null,
  keepAdminId: bigint | null = null
): Promise<ResolvedRefs> {
  const studentId = BigInt(data.student_id);
  const student = await tx.students.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, phone: true, email: true },
  });
  if (!student) {
    throw new ConsultationRequestError(400, "선택한 학생을 찾을 수 없습니다. 학생을 다시 선택해 주세요.", "student_id");
  }

  let guardianId: bigint | null = null;
  let contact = { name: student.name, phone: student.phone, email: student.email };

  if (data.counterpart_type === "guardian") {
    guardianId = BigInt(data.guardian_id as string);
    const link = await tx.student_guardians.findFirst({
      where: { student_id: studentId, guardian_id: guardianId },
      select: { guardians: { select: { name: true, phone: true, email: true } } },
    });
    if (!link) {
      throw new ConsultationRequestError(
        400,
        "선택한 보호자는 이 학생과 연결되어 있지 않습니다. 보호자를 다시 선택해 주세요.",
        "guardian_id"
      );
    }
    contact = { name: link.guardians.name, phone: link.guardians.phone, email: link.guardians.email };
  }

  let adminId: bigint | null = null;
  if (assignedAdminId) {
    adminId = BigInt(assignedAdminId);
    const admin = await tx.admin_users.findUnique({
      where: { id: adminId },
      select: { id: true, is_active: true },
    });
    if (!admin) {
      throw new ConsultationRequestError(400, "선택한 담당자를 찾을 수 없습니다.", "assigned_admin_id");
    }
    if (!admin.is_active && adminId !== keepAdminId) {
      throw new ConsultationRequestError(400, "비활성화된 관리자는 담당자로 지정할 수 없습니다.", "assigned_admin_id");
    }
  }

  return {
    student_id: studentId,
    guardian_id: guardianId,
    assigned_admin_id: adminId,
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
  };
}

/** 저장할 컬럼 값 (등록·수정 공통) */
export function consultationColumns(data: CleanConsultation, refs: ResolvedRefs) {
  return {
    student_id: refs.student_id,
    counterpart_type: data.counterpart_type,
    guardian_id: refs.guardian_id,
    name: refs.name,
    phone: refs.phone,
    email: refs.email,
    consulted_at: dateOnly(data.consulted_at),
    inquiry_type: data.inquiry_type,
    message: data.message,
    result: data.result,
    next_consultation_date: data.next_consultation_date ? dateOnly(data.next_consultation_date) : null,
    status: data.status,
    assigned_admin_id: refs.assigned_admin_id,
  };
}

/** 입력 검사 오류 응답 본문 */
export function validationErrorBody(errors: Record<string, string>) {
  return { success: false, message: Object.values(errors)[0], errors };
}
