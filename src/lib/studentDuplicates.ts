// src/lib/studentDuplicates.ts
// 학생 등록·수정 시 "중복 의심" 학생 찾기 — 서버에서만 사용합니다.
//
// 아래 조건 중 하나라도 기존 학생과 같으면 중복 의심으로 봅니다. (차단하지 않고 경고만)
//   A. 이름 + 생년월일          (대소문자 무시)
//   B. 영문 이름 + 생년월일     (대소문자 무시)
//   C. 전화번호                 (하이픈·공백을 뺀 숫자열로 비교)
//   D. 이메일                   (대소문자 무시)
// 빈 생년월일·전화번호·이메일은 비교하지 않습니다. (빈 값끼리 같다고 보지 않음)
// 수정 시에는 excludeStudentId로 수정 중인 학생 본인을 비교 대상에서 제외합니다. (WHERE id <> 본인)

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { phoneForCompare, type CleanStudent } from "@/lib/studentValidation";

export type DuplicateReason = "name_birth" | "name_en_birth" | "phone" | "email";

/** 경고 화면에 보낼 최소 정보 (전화번호·이메일은 마스킹) */
export interface DuplicateCandidate {
  id: string;
  student_no: string | null;
  name: string;
  name_en: string | null;
  birth_date: string | null;
  phone_masked: string | null;
  email_masked: string | null;
  status: string;
  reasons: DuplicateReason[];
}

const MAX_CANDIDATES = 10;

interface SelectedStudent {
  id: bigint;
  student_no: string | null;
  name: string;
  name_en: string | null;
  birth_date: Date | null;
  phone: string | null;
  email: string | null;
  status: string;
}

/** 010-1234-5678 → 010-1234-**** (마지막 숫자 4개만 가림, 형식은 유지) */
export function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  let remaining = 4;
  const chars = phone.split("");
  for (let i = chars.length - 1; i >= 0 && remaining > 0; i -= 1) {
    if (/[0-9]/.test(chars[i])) {
      chars[i] = "*";
      remaining -= 1;
    }
  }
  return chars.join("");
}

/** test@example.com → tes***@example.com (앞 최대 3글자만 표시) */
export function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const visible = local.slice(0, Math.min(3, Math.max(1, local.length - 1)));
  return `${visible}***${email.slice(at)}`;
}

function sameText(a: string | null, b: string | null): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

export async function findDuplicateCandidates(
  data: CleanStudent,
  options: { excludeStudentId?: bigint } = {}
): Promise<DuplicateCandidate[]> {
  const excludeId = options.excludeStudentId ?? null;
  const birthDate = data.birth_date ? new Date(`${data.birth_date}T00:00:00.000Z`) : null;
  const phoneKey = phoneForCompare(data.phone);
  const emailKey = data.email ? data.email.trim() : null;

  const or: Prisma.studentsWhereInput[] = [];

  if (birthDate) {
    // A. 이름 + 생년월일
    or.push({ name: { equals: data.name, mode: "insensitive" }, birth_date: birthDate });
    // B. 영문 이름 + 생년월일
    if (data.name_en) {
      or.push({ name_en: { equals: data.name_en, mode: "insensitive" }, birth_date: birthDate });
    }
  }

  // D. 이메일 (대소문자 무시)
  if (emailKey) {
    or.push({ email: { equals: emailKey, mode: "insensitive" } });
  }

  // C. 전화번호: 저장된 번호에서도 하이픈·공백을 빼고 비교해야 하므로 DB 함수(regexp_replace) 사용
  if (phoneKey) {
    const phoneRows =
      excludeId === null
        ? await prisma.$queryRaw<{ id: bigint }[]>`
            SELECT id FROM students
            WHERE phone IS NOT NULL
              AND regexp_replace(phone, '[[:space:]-]', '', 'g') = ${phoneKey}
            LIMIT ${MAX_CANDIDATES}
          `
        : await prisma.$queryRaw<{ id: bigint }[]>`
            SELECT id FROM students
            WHERE phone IS NOT NULL
              AND id <> ${excludeId}
              AND regexp_replace(phone, '[[:space:]-]', '', 'g') = ${phoneKey}
            LIMIT ${MAX_CANDIDATES}
          `;
    if (phoneRows.length > 0) {
      or.push({ id: { in: phoneRows.map((row: { id: bigint }) => BigInt(row.id)) } });
    }
  }

  if (or.length === 0) return [];

  const students = await prisma.students.findMany({
    // 수정 중인 학생 본인은 어떤 조건으로도 후보에 포함하지 않음
    where: excludeId === null ? { OR: or } : { OR: or, NOT: { id: excludeId } },
    select: {
      id: true,
      student_no: true,
      name: true,
      name_en: true,
      birth_date: true,
      phone: true,
      email: true,
      status: true,
    },
    orderBy: { id: "desc" },
    take: MAX_CANDIDATES,
  });

  return students.map((s: SelectedStudent) => {
    const sBirth = s.birth_date ? s.birth_date.toISOString().slice(0, 10) : null;
    const reasons: DuplicateReason[] = [];
    if (data.birth_date && sBirth === data.birth_date) {
      if (sameText(s.name, data.name)) reasons.push("name_birth");
      if (sameText(s.name_en, data.name_en)) reasons.push("name_en_birth");
    }
    if (phoneKey && phoneForCompare(s.phone) === phoneKey) reasons.push("phone");
    if (emailKey && sameText(s.email, emailKey)) reasons.push("email");

    return {
      id: s.id.toString(),
      student_no: s.student_no,
      name: s.name,
      name_en: s.name_en,
      birth_date: sBirth,
      phone_masked: maskPhone(s.phone),
      email_masked: maskEmail(s.email),
      status: s.status,
      reasons,
    };
  });
}
