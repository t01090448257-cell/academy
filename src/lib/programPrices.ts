// src/lib/programPrices.ts
// 프로그램 가격(program_prices) 서버 공용 도우미
// - 특정 날짜의 적용 가격 조회 (수납 등록에서 수강료 기본값으로 사용)
// - 활성 가격끼리 기간이 겹치지 않도록 확인 (기간 옵션 행 잠금으로 동시 저장도 방지)
// - 가격 변경 기록(admin_logs)

import { isIP } from "node:net";
import type { NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { serializeBigInt } from "@/lib/serialize";

type Db = Prisma.TransactionClient;

export const PRICE_SELECT = {
  id: true,
  program_option_id: true,
  price: true,
  currency: true,
  valid_from: true,
  valid_until: true,
  is_active: true,
  created_at: true,
} satisfies Prisma.program_pricesSelect;

/** 요청 처리 중 정해진 응답을 돌려주기 위한 오류 (트랜잭션 안에서 던지면 전체 취소) */
export class PriceRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public field?: string
  ) {
    super(message);
  }
}

/** @db.Date 컬럼: 시간대 영향 없이 날짜 그대로 */
export function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** @db.Date 값 → YYYY-MM-DD */
export function dateText(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/** id 문자열 → BigInt (숫자가 아니면 null) */
export function parseId(value: unknown): bigint | null {
  const text = typeof value === "number" && Number.isSafeInteger(value) ? String(value) : value;
  return typeof text === "string" && /^\d{1,18}$/.test(text.trim()) ? BigInt(text.trim()) : null;
}

/** 특정 날짜(YYYY-MM-DD)에 적용되는 활성 가격 (없으면 null) */
export async function findCurrentPrice(db: Db, programOptionId: bigint, date: string) {
  const day = dateOnly(date);
  return db.program_prices.findFirst({
    where: {
      program_option_id: programOptionId,
      is_active: true,
      valid_from: { lte: day },
      OR: [{ valid_until: null }, { valid_until: { gte: day } }],
    },
    orderBy: [{ valid_from: "desc" }, { id: "desc" }],
    select: PRICE_SELECT,
  });
}

/** 같은 기간 옵션의 가격 저장을 한 번에 하나씩 처리 (동시에 저장해 기간이 겹치는 것을 방지) */
export async function lockProgramOption(db: Db, programOptionId: bigint): Promise<boolean> {
  const rows = await db.$queryRaw<{ id: bigint }[]>`
    SELECT id FROM program_options WHERE id = ${programOptionId} FOR UPDATE
  `;
  return rows.length > 0;
}

/** [from, until] 기간과 겹치는 활성 가격 (excludeId 제외) */
export async function findOverlappingPrices(
  db: Db,
  programOptionId: bigint,
  from: string,
  until: string | null,
  excludeId: bigint | null = null
) {
  return db.program_prices.findMany({
    where: {
      program_option_id: programOptionId,
      is_active: true,
      ...(excludeId !== null ? { id: { not: excludeId } } : {}),
      ...(until !== null ? { valid_from: { lte: dateOnly(until) } } : {}),
      OR: [{ valid_until: null }, { valid_until: { gte: dateOnly(from) } }],
    },
    orderBy: [{ valid_from: "asc" }, { id: "asc" }],
    select: PRICE_SELECT,
  });
}

/** admin_logs.ip_address(inet)에 넣을 수 있는 IP만 (형식이 다르면 null) */
export function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = forwarded || request.headers.get("x-real-ip")?.trim() || "";
  return candidate && isIP(candidate) ? candidate : null;
}

/** 가격 변경 기록 (기존 admin_logs 구조 그대로 사용) */
export async function logPriceChange(
  db: Db,
  entry: {
    adminId: bigint;
    /** SET_CURRENT: 「현재 적용 가격 선택」으로 바뀐 행 (가격 이력 수정 UPDATE와 구분) */
    action: "CREATE" | "UPDATE" | "SET_CURRENT";
    recordId: bigint;
    oldData: unknown;
    newData: unknown;
    ip: string | null;
  }
) {
  await db.admin_logs.create({
    data: {
      admin_user_id: entry.adminId,
      action: entry.action,
      table_name: "program_prices",
      record_id: entry.recordId,
      old_data: entry.oldData === null ? undefined : (serializeBigInt(entry.oldData) as unknown as Prisma.InputJsonValue),
      new_data: entry.newData === null ? undefined : (serializeBigInt(entry.newData) as unknown as Prisma.InputJsonValue),
      ip_address: entry.ip,
    },
  });
}
