// src/config/pricing.ts
// ─────────────────────────────────────────────────────────────────────
// SYA 연수 비용 데이터 중 "아직 DB에서 관리하지 않는 항목"만 둡니다.
//
// ⚠️ 과정 교육비(학비)는 여기에 두지 않습니다.
//    교육비와 기간(주수)은 관리자 > 프로그램 관리(DB)에서만 입력하며,
//    홈페이지는 빌드 시 DB의 현재 적용 가격을 읽습니다. (src/lib/publicTuition.server.ts)
//    DB에 가격이 없으면 "상담 시 안내"로 표시하고, 이 파일의 값으로 대체하지 않습니다.
//
// 이 파일에 남은 항목: 가족캠프 추가 인원 비용, 숙소, 추가 옵션 (기존 구조 유지)
// - 모든 금액은 원화(KRW) 정수, null 또는 값 없음 = 미정 → "상담 시 안내", 합계에서 제외
// - 기간별 금액은 서로 독립된 값입니다. 다른 기간 금액으로 계산하지 않습니다.
// - 계산 로직은 src/lib/pricing.ts에 있습니다.
// ─────────────────────────────────────────────────────────────────────

import type { CourseId } from "./courses";

/**
 * 연수 기간 (주). 선택 가능한 기간은 코드에 고정하지 않고
 * 관리자에서 과정별로 "홈페이지 표시"로 지정한 기간을 사용합니다.
 */
export type DurationWeeks = number;

/** 기간(주수)별 금액 (KRW). 값이 없거나 null = 미정 */
export type DurationPrices = Partial<Record<number, number | null>>;

/** 정규반·방학캠프: 참가자 1명 기준 (교육비는 DB) */
export interface StandardCoursePricing {
  kind: "standard";
}

/** 상시 가족캠프: 어린이 1명 교육비(DB) + 추가 인원 비용(아직 DB 미관리)을 각각 관리 */
export interface FamilyCoursePricing {
  kind: "family";
  /** 어린이 2명째부터 1명당 추가 비용 */
  additionalChild: DurationPrices;
  /** 부모 1명 동반 추가 비용 */
  additionalParent: DurationPrices;
  /** 부모 2명째 동반 추가 비용 */
  additionalParent2: DurationPrices;
}

export type CoursePricing = StandardCoursePricing | FamilyCoursePricing;

/** 숙소 (운영 우선순위 순서. 예약/배정 로직은 추후 예약 단계에서 구현) */
export interface AccommodationPricing {
  id: string;
  name: string;
  /** 1 = 우선 배정, 숫자가 클수록 후순위 */
  priority: number;
  /** 요금 기준: 참가자 1인당 / 객실 1개당 */
  unit: "perPerson" | "perRoom";
  rates: DurationPrices;
}

/** 추가 옵션 (예: 공항 픽업 등). 관리자 페이지에서 항목을 추가합니다. */
export interface AdditionalOptionPricing {
  id: string;
  /** 언어별 표시 이름 (en은 필수, 없는 언어는 en 표시) */
  name: { en: string } & Partial<Record<string, string>>;
  /** 계산기에 기본으로 포함되는 항목인지 */
  required: boolean;
  /** 기간 무관 1회 금액이면 flat, 기간별이면 byDuration */
  price: { type: "flat"; amount: number | null } | { type: "byDuration"; amounts: DurationPrices };
}

export interface PricingData {
  currency: "KRW";
  /** 이 파일 값의 기준일 */
  updatedAt: string;
  courses: Record<CourseId, CoursePricing>;
  familyLimits: { maxChildren: number; maxParents: number };
  accommodations: AccommodationPricing[];
  additionalOptions: AdditionalOptionPricing[];
}

/** 미정 (모든 기간 "상담 시 안내") */
const PENDING: DurationPrices = {};

/** 현재 프론트 초기값 (교육비 제외, 최종 확정가 아님) */
export const PRICING_DATA: PricingData = {
  currency: "KRW",
  updatedAt: "2026-09-23",
  courses: {
    intensiveEsl: { kind: "standard" },
    business: { kind: "standard" },
    studyAbroad: { kind: "standard" },
    summerWinterCamp: { kind: "standard" },
    familyCamp: {
      kind: "family",
      additionalChild: { ...PENDING },
      additionalParent: { ...PENDING },
      additionalParent2: { ...PENDING },
    },
  },
  familyLimits: { maxChildren: 3, maxParents: 2 },
  accommodations: [
    { id: "bePodsLahug", name: "BE Pods Lahug Hotel", priority: 1, unit: "perPerson", rates: { ...PENDING } },
    { id: "nobleHotel", name: "Noble Hotel", priority: 2, unit: "perPerson", rates: { ...PENDING } },
  ],
  additionalOptions: [],
};
