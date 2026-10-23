// src/lib/programOptions.ts
// 기간 옵션(program_options) 서버 공용 도우미
// - 같은 프로그램의 기간 추가·표시 설정 저장은 한 번에 하나씩 (프로그램 행 잠금 → 홈페이지 표시 4개 제한을 동시 저장에도 보장)
// - 홈페이지 표시 개수, 사용 가능한 가격 여부 확인
// - 변경 기록(admin_logs, table_name = program_options)

import type { Prisma } from "@/generated/prisma/client";
import { serializeBigInt } from "@/lib/serialize";
import { dateOnly } from "@/lib/programPrices";

type Db = Prisma.TransactionClient;

export const OPTION_SELECT = {
  id: true,
  program_id: true,
  name: true,
  duration_weeks: true,
  is_active: true,
  is_public: true,
  display_order: true,
} satisfies Prisma.program_optionsSelect;

/** 프로그램 행 잠금 + 코드 조회 (없으면 null) */
export async function lockProgram(db: Db, programId: bigint): Promise<{ id: bigint; code: string } | null> {
  const rows = await db.$queryRaw<{ id: bigint; code: string }[]>`
    SELECT id, code FROM programs WHERE id = ${programId} FOR UPDATE
  `;
  return rows[0] ?? null;
}

/** 프로그램에서 홈페이지 표시 중인(활성) 기간 수 (excludeOptionId 제외) */
export async function countPublicOptions(db: Db, programId: bigint, excludeOptionId: bigint | null = null): Promise<number> {
  return db.program_options.count({
    where: {
      program_id: programId,
      is_public: true,
      is_active: true,
      ...(excludeOptionId !== null ? { id: { not: excludeOptionId } } : {}),
    },
  });
}

/** 다음 홈페이지 표시 순서 (현재 최댓값 + 1, 최대 99) */
export async function nextDisplayOrder(db: Db, programId: bigint): Promise<number> {
  const result = await db.program_options.aggregate({
    where: { program_id: programId, display_order: { not: null } },
    _max: { display_order: true },
  });
  return Math.min((result._max.display_order ?? 0) + 1, 99);
}

/** 적용 중이거나 적용 예정인 활성 가격이 있는지 (오늘 기준) */
export async function hasUsablePrice(db: Db, optionId: bigint, today: string): Promise<boolean> {
  const count = await db.program_prices.count({
    where: {
      program_option_id: optionId,
      is_active: true,
      OR: [{ valid_until: null }, { valid_until: { gte: dateOnly(today) } }],
    },
  });
  return count > 0;
}

/** 기간 옵션 변경 기록 (기존 admin_logs 구조 그대로 사용) */
export async function logOptionChange(
  db: Db,
  entry: {
    adminId: bigint;
    action: "CREATE" | "UPDATE";
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
      table_name: "program_options",
      record_id: entry.recordId,
      old_data: entry.oldData === null ? undefined : (serializeBigInt(entry.oldData) as unknown as Prisma.InputJsonValue),
      new_data: entry.newData === null ? undefined : (serializeBigInt(entry.newData) as unknown as Prisma.InputJsonValue),
      ip_address: entry.ip,
    },
  });
}
