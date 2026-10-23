// src/lib/programPriceValidation.ts
// 프로그램 가격(program_prices) 입력 검사와 표시용 규칙 — 화면과 API가 같은 규칙을 사용합니다. (DB 조회 없음)
//
// 가격 이력 규칙
// - 가격 1행 = 한 기간 옵션(program_options)의 [valid_from ~ valid_until] 동안의 가격
// - 같은 기간 옵션에서 "활성(is_active) 가격"끼리는 적용 기간이 겹칠 수 없음
// - 특정 날짜의 적용 가격 = 그날이 기간 안에 있는 활성 가격 (겹치지 않으므로 최대 1건)
// - 가격을 바꿀 때는 기존 행을 지우지 않고 새 가격을 추가 → 기존 가격은 새 가격 시작 전날로 종료 처리
// - 삭제 기능은 두지 않음 (잘못 입력한 가격은 비활성화)

/** 현재 지원 통화 (program_prices.currency 기본값 KRW) */
export const PRICE_CURRENCIES = ["KRW"] as const;
export type PriceCurrency = (typeof PRICE_CURRENCIES)[number];
export const DEFAULT_PRICE_CURRENCY: PriceCurrency = "KRW";

/** program_prices.price = Decimal(12,2) → 원화 정수 최대 9,999,999,999 */
export const MAX_PRICE = 9_999_999_999;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface PriceInput {
  price?: unknown;
  currency?: unknown;
  valid_from?: unknown;
  valid_until?: unknown;
  is_active?: unknown;
}

export interface CleanPrice {
  /** 원화 정수 문자열 (Decimal로 그대로 저장, 소수 계산 없음) */
  price: string;
  currency: PriceCurrency;
  /** YYYY-MM-DD */
  valid_from: string;
  /** YYYY-MM-DD 또는 null(종료일 없음) */
  valid_until: string | null;
  is_active: boolean;
}

export type PriceErrors = Record<string, string>;

/** 한국 시간 기준 오늘 (YYYY-MM-DD) */
export function todayKst(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** YYYY-MM-DD 하루 전 */
export function previousDay(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM-DD 하루 뒤 */
export function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function checkDate(value: string): string | null {
  const match = DATE_RE.exec(value);
  if (!match) return "날짜 형식이 올바르지 않습니다. (예: 2026-10-01)";
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return "존재하지 않는 날짜입니다.";
  }
  if (y < 2000 || y > 2100) return "날짜를 다시 확인해 주세요.";
  return null;
}

/** "1,200,000" / "1200000" / 1200000 → "1200000" (원화 정수만 허용) */
export function normalizePrice(value: unknown): string | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? String(value) : null;
  }
  if (typeof value !== "string") return null;
  const compact = value.replace(/[,\s]/g, "");
  if (!/^\d+$/.test(compact)) return null;
  return compact.replace(/^0+(?=\d)/, "");
}

export function validatePriceInput(input: PriceInput): { data: CleanPrice; errors: PriceErrors } {
  const errors: PriceErrors = {};

  const rawPrice = input.price;
  const price = normalizePrice(rawPrice);
  const currency = typeof input.currency === "string" && input.currency ? input.currency.trim().toUpperCase() : DEFAULT_PRICE_CURRENCY;
  const validFrom = typeof input.valid_from === "string" ? input.valid_from.trim() : "";
  const validUntil = typeof input.valid_until === "string" && input.valid_until.trim() ? input.valid_until.trim() : null;

  const data: CleanPrice = {
    price: price ?? "",
    currency: DEFAULT_PRICE_CURRENCY,
    valid_from: validFrom,
    valid_until: validUntil,
    is_active: input.is_active === undefined ? true : input.is_active === true,
  };

  if (rawPrice === undefined || rawPrice === null || rawPrice === "") errors.price = "금액을 입력해 주세요.";
  else if (price === null) errors.price = "금액은 원 단위 숫자로 입력해 주세요. (소수·음수 불가)";
  else if (BigInt(price) <= BigInt(0)) errors.price = "금액은 0원보다 커야 합니다.";
  else if (BigInt(price) > BigInt(MAX_PRICE)) errors.price = "금액이 너무 큽니다.";

  if (!(PRICE_CURRENCIES as readonly string[]).includes(currency)) {
    errors.currency = "현재는 원화(KRW)만 사용할 수 있습니다.";
  }

  if (!validFrom) errors.valid_from = "적용 시작일을 입력해 주세요.";
  else {
    const message = checkDate(validFrom);
    if (message) errors.valid_from = message;
  }

  if (validUntil) {
    const message = checkDate(validUntil);
    if (message) errors.valid_until = message;
    else if (!errors.valid_from && validUntil < validFrom) errors.valid_until = "적용 종료일은 시작일과 같거나 이후여야 합니다.";
  }

  if (input.is_active !== undefined && typeof input.is_active !== "boolean") {
    errors.is_active = "활성 여부가 올바르지 않습니다.";
  }

  return { data, errors };
}

/** 두 기간 [a1, a2], [b1, b2] (끝이 null이면 종료일 없음)이 겹치는지 — YYYY-MM-DD 문자열 비교 */
export function periodsOverlap(a1: string, a2: string | null, b1: string, b2: string | null): boolean {
  return (a2 === null || b1 <= a2) && (b2 === null || a1 <= b2);
}

export type PriceState = "inactive" | "scheduled" | "ended" | "current";

/** 기준일(기본: 오늘)에 대한 가격 행의 상태 */
export function priceState(
  row: { valid_from: string; valid_until: string | null; is_active: boolean },
  today: string = todayKst()
): PriceState {
  if (!row.is_active) return "inactive";
  const from = row.valid_from.slice(0, 10);
  const until = row.valid_until ? row.valid_until.slice(0, 10) : null;
  if (from > today) return "scheduled";
  if (until !== null && until < today) return "ended";
  return "current";
}

export const PRICE_STATE_LABELS: Record<PriceState, string> = {
  current: "현재 적용",
  scheduled: "적용 예정",
  ended: "종료",
  inactive: "비활성",
};

/** 원화 표시: 1200000 → "1,200,000원" */
export function formatWon(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const text = String(value);
  const integer = text.includes(".") ? text.replace(/\.0+$/, "") : text;
  if (!/^\d+$/.test(integer)) return text;
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}원`;
}

/* ------------------------------------------------------------------ */
/* 현재 적용 가격 선택                                                  */
/* ------------------------------------------------------------------ */
// 「가격 이력 수정」(PUT /api/programs/prices/[id])과 구분되는 동작입니다.
// 이력 중 한 가격을 골라 "오늘(기준일)부터 적용되는 가격"으로 지정합니다. 행은 삭제·추가하지 않습니다.
//   1. 기준일에 적용 중인 다른 활성 가격 → 비활성 처리 (기간은 그대로 보존)
//   2. 선택한 가격 → 활성. 기간이 기준일을 포함하지 않으면 포함하도록 최소한으로 조정
//      - 시작일이 기준일보다 뒤 → 기준일로
//      - 종료일이 기준일보다 앞(이미 종료) → 종료일 없음으로
//      - 이후 시작하는 다른 활성(예정) 가격이 있으면 그 전날까지로 (예정 가격은 그대로 유지)
//      - 기준일 이전에 끝난 다른 활성 가격과 겹치면 그 다음 날부터로 (과거 이력과 겹치지 않게)
// 결과: 같은 기간 옵션에서 기준일에 적용되는 가격은 선택한 1건뿐이고, 활성 가격끼리 기간이 겹치지 않음
// 화면(확인창 미리보기)과 서버(실제 저장)가 같은 함수를 사용합니다. 서버는 DB에서 읽은 최신 값으로 다시 계산합니다.

export interface PriceRowLike {
  id: string;
  price?: string;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
}

export interface CurrentPricePlan {
  targetId: string;
  /** 이미 기준일 적용 가격이라 바꿀 것이 없음 */
  alreadyCurrent: boolean;
  /** 비활성 처리할 (기준일에 적용 중이던) 가격 id */
  deactivateIds: string[];
  valid_from: string;
  valid_until: string | null;
  /** 선택한 가격의 적용 기간이 바뀌는지 */
  periodChanged: boolean;
  /** 선택한 가격 다음에 적용될 예정 가격 (있으면) */
  nextScheduled: PriceRowLike | null;
}

export function planCurrentPrice(rows: PriceRowLike[], targetId: string, today: string = todayKst()): CurrentPricePlan | null {
  const norm = (row: PriceRowLike): PriceRowLike => ({
    ...row,
    valid_from: row.valid_from.slice(0, 10),
    valid_until: row.valid_until ? row.valid_until.slice(0, 10) : null,
  });
  const all = rows.map(norm);
  const target = all.find((row) => row.id === targetId);
  if (!target) return null;

  const covers = (row: PriceRowLike) => row.valid_from <= today && (row.valid_until === null || row.valid_until >= today);
  const others = all.filter((row) => row.id !== targetId && row.is_active);
  const coveringToday = others.filter(covers);
  const remaining = others.filter((row) => !covers(row));

  if (target.is_active && covers(target) && coveringToday.length === 0) {
    const nextScheduled = remaining.filter((row) => row.valid_from > today).sort((a, b) => (a.valid_from < b.valid_from ? -1 : 1))[0] ?? null;
    return {
      targetId,
      alreadyCurrent: true,
      deactivateIds: [],
      valid_from: target.valid_from,
      valid_until: target.valid_until,
      periodChanged: false,
      nextScheduled,
    };
  }

  let from = target.valid_from <= today ? target.valid_from : today;
  let until = target.valid_until !== null && target.valid_until >= today ? target.valid_until : null;

  // 이후 예정된 활성 가격이 있으면 그 전날까지만
  const nextScheduled = remaining.filter((row) => row.valid_from > today).sort((a, b) => (a.valid_from < b.valid_from ? -1 : 1))[0] ?? null;
  if (nextScheduled && (until === null || until >= nextScheduled.valid_from)) {
    until = previousDay(nextScheduled.valid_from);
  }

  // 기준일 전에 끝난 활성 가격과 겹치면 그 다음 날부터
  const pastEnds = remaining
    .filter((row) => row.valid_until !== null && row.valid_until < today && row.valid_until >= from)
    .map((row) => row.valid_until as string)
    .sort();
  if (pastEnds.length > 0) from = nextDay(pastEnds[pastEnds.length - 1]);

  return {
    targetId,
    alreadyCurrent: false,
    deactivateIds: coveringToday.map((row) => row.id),
    valid_from: from,
    valid_until: until,
    periodChanged: from !== target.valid_from || until !== target.valid_until,
    nextScheduled,
  };
}
