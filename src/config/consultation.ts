// src/config/consultation.ts
// 상담 신청 폼의 "관심 있는 경험" 선택지 (교육과정이 아님)
//
// - 교육과정(COURSE_IDS)·가격·계산기와 완전히 분리된 값입니다.
// - 복수 선택 가능, 제출 데이터에는 이 ID 배열 그대로 담깁니다. (추후 DB 저장용)
// - 표시 문구는 dictionary(dict.consultation.interests)에 있습니다.

export const INTEREST_IDS = ["cebuMonthStay", "localSchool"] as const;

export type InterestId = (typeof INTEREST_IDS)[number];

export function isInterestId(value: string): value is InterestId {
  return (INTEREST_IDS as readonly string[]).includes(value);
}

/** 중복·잘못된 값을 제거하고 INTEREST_IDS 순서로 정렬 */
export function normalizeInterests(values: readonly string[] | undefined): InterestId[] {
  if (!values) return [];
  return INTEREST_IDS.filter((id) => values.includes(id));
}
