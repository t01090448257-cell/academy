// src/lib/pricing.ts
// 연수 비용 계산 로직 (실시간 맞춤견적서)
// - 교육비: 관리자 DB의 현재 적용 가격 (PublicTuitionData — 학비표와 같은 데이터, src/lib/publicTuition.ts)
// - 가족캠프 추가 인원·숙박비·추가 옵션: 아직 DB에서 관리하지 않으므로 src/config/pricing.ts(PRICING_DATA)
// 교육비 + 숙박비 + 추가 옵션 = 예상 총액 (미정 금액은 합계에서 제외하고 "상담 시 안내"로 표시)
// 가격이 없는 기간을 다른 기간 금액으로 계산하거나 다른 값으로 대체하지 않습니다.

import type { CourseId, StayOptionId } from "@/config/courses";
import {
  PRICING_DATA,
  type AccommodationPricing,
  type DurationPrices,
  type DurationWeeks,
  type PricingData,
} from "@/config/pricing";
import { getCourseTuition, type PublicTuitionData } from "@/lib/publicTuition";

export type EstimateLineKey = "tuition" | "additionalChild" | "parent" | "stay" | "option";

export interface EstimateLine {
  key: EstimateLineKey;
  /** 추가 옵션일 때만 옵션 id */
  optionId?: string;
  quantity: number;
  /** null = 미정 (상담 시 안내) */
  amount: number | null;
}

export interface EstimateInput {
  courseId: CourseId;
  /** 선택한 기간 (이 과정에 홈페이지 표시 기간이 없으면 null) */
  weeks: DurationWeeks | null;
  /** 가족캠프 어린이 수 (그 외 과정은 1) */
  childCount?: number;
  /** 가족캠프 부모 수 0~2 */
  parentCount?: number;
  stay: StayOptionId;
}

export interface Estimate {
  education: EstimateLine[];
  stay: EstimateLine | null;
  options: EstimateLine[];
  /** 확정된 금액만 더한 합계 */
  knownTotal: number;
  /** 미정 금액이 하나라도 있는지 */
  hasPending: boolean;
  /** 교육비 자체가 미정인지 (이 경우 총액을 표시하지 않음) */
  tuitionPending: boolean;
}

/** 금액 표시: 모든 언어 동일하게 원화 기호 + 천 단위 구분 */
export function formatKrw(amount: number): string {
  return `₩${amount.toLocaleString("en-US")}`;
}

/** 운영 우선순위가 가장 높은 숙소 (견적 기준 숙소) */
export function getPrimaryAccommodation(data: PricingData = PRICING_DATA): AccommodationPricing | undefined {
  return [...data.accommodations].sort((a, b) => a.priority - b.priority)[0];
}

/** 과정의 기간별 대표 교육비 (가족캠프는 어린이 1명 기준) — DB 가격만 사용 */
export function getBaseTuition(courseId: CourseId, weeks: DurationWeeks | null, tuition: PublicTuitionData): number | null {
  return getCourseTuition(tuition, courseId, weeks);
}

/** 기간별 금액 조회 (값이 없으면 null = 미정) */
function priceFor(prices: DurationPrices, weeks: DurationWeeks | null): number | null {
  if (weeks === null) return null;
  return prices[weeks] ?? null;
}

function multiply(amount: number | null, quantity: number): number | null {
  return amount === null ? null : amount * quantity;
}

export function calculateEstimate(
  input: EstimateInput,
  tuition: PublicTuitionData,
  data: PricingData = PRICING_DATA
): Estimate {
  const { courseId, weeks, stay } = input;
  const pricing = data.courses[courseId];
  const baseTuition = getBaseTuition(courseId, weeks, tuition);
  const education: EstimateLine[] = [];
  let persons = 1;

  if (pricing.kind === "family") {
    const children = Math.min(Math.max(input.childCount ?? 1, 1), data.familyLimits.maxChildren);
    const parents = Math.min(Math.max(input.parentCount ?? 0, 0), data.familyLimits.maxParents);
    persons = children + parents;

    education.push({ key: "tuition", quantity: 1, amount: baseTuition });
    if (children > 1) {
      education.push({
        key: "additionalChild",
        quantity: children - 1,
        amount: multiply(priceFor(pricing.additionalChild, weeks), children - 1),
      });
    }
    if (parents >= 1) education.push({ key: "parent", quantity: 1, amount: priceFor(pricing.additionalParent, weeks) });
    if (parents >= 2) education.push({ key: "parent", quantity: 1, amount: priceFor(pricing.additionalParent2, weeks) });
  } else {
    education.push({ key: "tuition", quantity: 1, amount: baseTuition });
  }

  let stayLine: EstimateLine | null = null;
  if (stay === "included") {
    const accommodation = getPrimaryAccommodation(data);
    const quantity = accommodation?.unit === "perRoom" ? 1 : persons;
    stayLine = {
      key: "stay",
      quantity,
      amount: accommodation ? multiply(priceFor(accommodation.rates, weeks), quantity) : null,
    };
  }

  const options: EstimateLine[] = data.additionalOptions
    .filter((option) => option.required)
    .map((option) => ({
      key: "option" as const,
      optionId: option.id,
      quantity: 1,
      amount: option.price.type === "flat" ? option.price.amount : priceFor(option.price.amounts, weeks),
    }));

  const all = [...education, ...(stayLine ? [stayLine] : []), ...options];
  const knownTotal = all.reduce((sum, line) => sum + (line.amount ?? 0), 0);

  return {
    education,
    stay: stayLine,
    options,
    knownTotal,
    hasPending: all.some((line) => line.amount === null),
    tuitionPending: education[0]?.amount === null,
  };
}
