// src/config/schedule.ts
// 과정 시작일과 숙소 입실일은 서로 다른 개념이므로 따로 관리합니다.
// (현재는 규칙 정의만 있고, 예약/DB 단계에서 날짜 계산에 사용합니다.)
// 요일: 0 = 일요일 … 6 = 토요일

export const SCHEDULE_RULES = {
  /** 정규반 개강: 매월 첫 번째·세 번째 월요일 (캠프반에는 적용하지 않음) */
  regularCourseStart: { weekday: 1, weeksOfMonth: [1, 3] },
  /** 숙소 입실: 과정 시작 전 토요일 또는 일요일 */
  accommodationCheckIn: { weekdays: [6, 0] },
} as const;
