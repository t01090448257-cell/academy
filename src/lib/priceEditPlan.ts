// src/lib/priceEditPlan.ts
// ─────────────────────────────────────────────────────────────────────
// 관리자 「수정」에서 가격을 바꿀 때의 처리 계획 (DB 조회 없음 — 화면 미리보기와 서버 저장이 같은 함수 사용)
//
// 원칙: 기존 가격 행은 지우거나 금액을 덮어쓰지 않습니다. (가격 이력 보존)
//   1. 금액·통화·시작일·종료일이 지금 가격과 같음          → 가격은 그대로 (none)
//   2. 금액·통화·시작일은 같고 종료일만 다름               → 지금 가격 행의 종료일만 조정 (adjustUntil)
//   3. 그 밖(금액 변경 등)                                → 새 가격 행 추가 (newPrice)
//        - 새 가격 기간과 겹치는 기존 활성 가격 중
//            · 새 시작일보다 먼저 시작한 가격 → 새 시작일 전날로 종료 (행·금액 보존)
//            · 새 시작일 이후(같은 날 포함) 시작한 가격 → 비활성 처리 (행·금액 보존)
//        - 결과적으로 같은 기간 옵션에서 활성 가격끼리 기간이 겹치지 않음 (서버가 저장 후 다시 확인)
// ─────────────────────────────────────────────────────────────────────

import { periodsOverlap, previousDay } from "@/lib/programPriceValidation";

export interface PlanPriceRow {
  id: string;
  price: string;
  currency: string;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
}

export interface PriceEditInput {
  /** 원화 정수 문자열 */
  price: string;
  currency: string;
  valid_from: string;
  valid_until: string | null;
}

export type PriceEditPlan =
  | { kind: "none" }
  | { kind: "adjustUntil"; id: string; valid_until: string | null }
  | {
      kind: "newPrice";
      /** 새 시작일 전날로 종료할 기존 가격 */
      close: { id: string; valid_until: string; price: string }[];
      /** 비활성 처리할 기존 가격 (행은 남음) */
      deactivate: { id: string; price: string }[];
    }
  | { kind: "error"; message: string };

const day = (value: string | null) => (value ? value.slice(0, 10) : null);
const won = (value: string) => value.replace(/\.0+$/, "");

/**
 * @param rows  같은 기간 옵션의 가격 이력 전체
 * @param base  수정 화면에 불러온 기준 가격 (현재 적용 가격, 없으면 적용 예정 가격, 둘 다 없으면 null)
 * @param input 수정 화면에 입력한 값 (검증을 통과한 값)
 */
export function planPriceEdit(rows: PlanPriceRow[], base: PlanPriceRow | null, input: PriceEditInput): PriceEditPlan {
  const norm = rows.map((row) => ({ ...row, valid_from: day(row.valid_from) as string, valid_until: day(row.valid_until), price: won(row.price), currency: row.currency.trim() }));
  const from = input.valid_from;
  const until = input.valid_until;
  const price = won(input.price);
  const currency = input.currency.trim();

  if (base) {
    const b = norm.find((row) => row.id === base.id);
    if (b) {
      const sameMain = b.price === price && b.currency === currency && b.valid_from === from;
      if (sameMain && b.valid_until === until) return { kind: "none" };
      if (sameMain) {
        const clash = norm.filter((row) => row.is_active && row.id !== b.id && periodsOverlap(row.valid_from, row.valid_until, from, until));
        if (clash.length > 0) {
          const first = clash[0];
          return {
            kind: "error",
            message: `종료일을 바꾸면 다른 활성 가격(${first.valid_from} ~ ${first.valid_until ?? "종료일 없음"})과 기간이 겹칩니다. 종료일을 다시 확인해 주세요.`,
          };
        }
        return { kind: "adjustUntil", id: b.id, valid_until: until };
      }
    }
  }

  const overlaps = norm.filter((row) => row.is_active && periodsOverlap(row.valid_from, row.valid_until, from, until));
  const close: { id: string; valid_until: string; price: string }[] = [];
  const deactivate: { id: string; price: string }[] = [];
  for (const row of overlaps) {
    if (row.valid_from < from) close.push({ id: row.id, valid_until: previousDay(from), price: row.price });
    else deactivate.push({ id: row.id, price: row.price });
  }
  return { kind: "newPrice", close, deactivate };
}
