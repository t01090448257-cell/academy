// src/lib/programOptionValidation.ts
// 기간 옵션(program_options) 입력 검사와 표시 규칙 — 관리자 화면과 API가 같은 규칙을 사용합니다. (DB 조회 없음)
//
// 기간 옵션 = 한 프로그램의 "N주" 과정 (주수는 관리자가 직접 입력, 코드에 고정 목록 없음)
// - 같은 프로그램 안에서 주수는 중복될 수 없음 (DB 고유 조건: program_id + duration_weeks)
// - 주수는 등록 후 바꾸지 않음 (수납 기록이 기간 옵션을 참조하므로). 잘못 만든 기간은 「사용 중지」
// - 홈페이지 표시(is_public): 프로그램별 최대 4개, 적용 중이거나 적용 예정인 활성 가격이 있어야 켤 수 있음
// - 홈페이지 표시 순서(display_order): 1~99, 비우면 저장 시 마지막 순서로 자동 지정

import {
  MAX_DISPLAY_ORDER,
  MAX_DURATION_WEEKS,
  MAX_PUBLIC_OPTIONS,
  MIN_DISPLAY_ORDER,
  MIN_DURATION_WEEKS,
} from "@/config/programPricing";
import { priceState, todayKst } from "@/lib/programPriceValidation";

export type OptionErrors = Record<string, string>;

export interface OptionSettingsInput {
  is_public?: unknown;
  display_order?: unknown;
  is_active?: unknown;
}

export interface CleanOptionSettings {
  is_public: boolean;
  /** null = 자동 지정(홈페이지 표시일 때) 또는 없음 */
  display_order: number | null;
  is_active: boolean;
}

function parseInteger(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d{1,6}$/.test(text)) return "invalid";
  return Number(text);
}

/** "6" / 6 → 6 (주수 정수만) */
export function validateDurationWeeks(value: unknown): { weeks: number | null; error?: string } {
  const parsed = parseInteger(value);
  if (parsed === null) return { weeks: null, error: "주수를 입력해 주세요." };
  if (parsed === "invalid") return { weeks: null, error: "주수는 숫자(정수)로 입력해 주세요." };
  if (parsed < MIN_DURATION_WEEKS || parsed > MAX_DURATION_WEEKS) {
    return { weeks: null, error: `주수는 ${MIN_DURATION_WEEKS}~${MAX_DURATION_WEEKS} 사이로 입력해 주세요.` };
  }
  return { weeks: parsed };
}

export function validateOptionSettings(input: OptionSettingsInput): { data: CleanOptionSettings; errors: OptionErrors } {
  const errors: OptionErrors = {};

  if (input.is_public !== undefined && typeof input.is_public !== "boolean") errors.is_public = "홈페이지 표시 여부가 올바르지 않습니다.";
  if (input.is_active !== undefined && typeof input.is_active !== "boolean") errors.is_active = "활성 여부가 올바르지 않습니다.";

  const order = parseInteger(input.display_order);
  if (order === "invalid") errors.display_order = "표시 순서는 숫자(정수)로 입력해 주세요.";
  else if (order !== null && (order < MIN_DISPLAY_ORDER || order > MAX_DISPLAY_ORDER)) {
    errors.display_order = `표시 순서는 ${MIN_DISPLAY_ORDER}~${MAX_DISPLAY_ORDER} 사이로 입력해 주세요.`;
  }

  return {
    data: {
      is_public: input.is_public === true,
      display_order: typeof order === "number" ? order : null,
      is_active: input.is_active === undefined ? true : input.is_active === true,
    },
    errors,
  };
}

/** 가격 행이 홈페이지 표시 조건을 만족하는지 (활성 + 오늘 적용 중 또는 적용 예정) */
export function isUsablePrice(row: { valid_from: string; valid_until: string | null; is_active: boolean }, today: string = todayKst()): boolean {
  const state = priceState(row, today);
  return state === "current" || state === "scheduled";
}

export function publicLimitMessage(): string {
  return `홈페이지 표시는 프로그램별 최대 ${MAX_PUBLIC_OPTIONS}개까지 가능합니다. 다른 기간의 홈페이지 표시를 끈 뒤 다시 시도해 주세요.`;
}

export const NO_PRICE_PUBLIC_MESSAGE = "적용 중이거나 적용 예정인 활성 가격이 없는 기간은 홈페이지에 표시할 수 없습니다. 가격을 먼저 등록해 주세요.";
