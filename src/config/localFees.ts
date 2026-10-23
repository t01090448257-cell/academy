// src/config/localFees.ts
// 현지 납부비용 항목과 금액 (관리자 페이지 연동 대상)
//
// - 금액 단위: 필리핀 페소(PHP) 정수
// - null = 확인·확정되지 않은 금액 → 화면에 "상담 시 안내"로 표시
// - 항목 이름과 설명은 dictionary(dict.localFees.items)에 있습니다.
// - 확정된 금액이 생기면 amountPhp에 숫자만 넣으면 됩니다.

export const LOCAL_FEE_IDS = [
  "ssp",
  "visaExtension1",
  "visaExtension2",
  "acrICard",
  "accommodationDeposit",
  "accommodationUtilities",
  "courseMaterials",
  "airportPickup",
] as const;

export type LocalFeeId = (typeof LOCAL_FEE_IDS)[number];

export interface LocalFee {
  /** PHP 금액. null = 상담 시 안내 */
  amountPhp: number | null;
}

export const LOCAL_FEES: Record<LocalFeeId, LocalFee> = {
  ssp: { amountPhp: null },
  visaExtension1: { amountPhp: null },
  visaExtension2: { amountPhp: null },
  acrICard: { amountPhp: null },
  accommodationDeposit: { amountPhp: null },
  accommodationUtilities: { amountPhp: null },
  courseMaterials: { amountPhp: null },
  airportPickup: { amountPhp: null },
};
