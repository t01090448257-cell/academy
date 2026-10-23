// src/lib/studentNumber.ts
// 학생번호(student_no) 자동 발급 — 서버에서만 사용합니다.
//
// 형식: SYA-<등록연도>-<4자리 일련번호>   예) SYA-2026-0001
// - 등록연도는 한국 시간(Asia/Seoul) 기준
// - 해당 연도 번호 중 가장 큰 일련번호 + 1 (9999를 넘으면 자릿수가 늘어남: SYA-2026-10000)
// - 동시에 두 명이 같은 번호를 받으면 students.student_no의 UNIQUE 제약이 막아 주고,
//   호출하는 쪽(POST /api/students)이 트랜잭션 전체를 다시 시도합니다.

import type { Prisma } from "@/generated/prisma/client";

export const STUDENT_NO_PREFIX = "SYA";
const SEQUENCE_DIGITS = 4;

/** 한국 시간 기준 현재 연도 */
export function currentStudentNoYear(now: Date = new Date()): number {
  const year = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", year: "numeric" }).format(now);
  return Number(year);
}

export function formatStudentNo(year: number, sequence: number): string {
  return `${STUDENT_NO_PREFIX}-${year}-${String(sequence).padStart(SEQUENCE_DIGITS, "0")}`;
}

/**
 * 해당 연도의 다음 학생번호를 계산합니다. (학생 등록 트랜잭션 안에서 호출)
 * 문자열 정렬이 아니라 일련번호를 숫자로 비교하므로 9999 → 10000도 올바르게 이어집니다.
 * 형식이 다른 기존 번호(직접 입력했던 번호 등)는 계산에서 제외됩니다.
 */
export async function nextStudentNo(tx: Prisma.TransactionClient, year: number): Promise<string> {
  const prefix = `${STUDENT_NO_PREFIX}-${year}-`;
  const pattern = `^${STUDENT_NO_PREFIX}-${year}-([0-9]+)$`;

  const rows = await tx.$queryRaw<{ max_no: number | bigint | null }[]>`
    SELECT MAX(CAST(SUBSTRING(student_no FROM ${pattern}) AS INTEGER)) AS max_no
    FROM students
    WHERE student_no LIKE ${`${prefix}%`}
  `;

  const current = rows[0]?.max_no == null ? 0 : Number(rows[0].max_no);
  return formatStudentNo(year, current + 1);
}

/** UNIQUE 제약 위반(P2002)인지 — 학생번호 충돌 시 재시도 판단용 */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}
