// src/config/programPricing.ts
// ─────────────────────────────────────────────────────────────────────
// 홈페이지 과정(CourseId) ↔ 관리자 프로그램 코드(programs.code) 매핑
//
// - 홈페이지는 과정 "이름"이 아니라 이 고유 코드로 DB 가격을 찾습니다.
// - 기간(주수)과 금액은 코드에 두지 않습니다. 모두 관리자 > 프로그램 관리(DB)에서 입력합니다.
// - REGULAR / CAMP 는 이전 구조의 프로그램입니다. 기존 수납 기록·가격 이력 보존을 위해
//   DB에 그대로 두고 관리자 화면에서 조회·관리만 가능하며, 홈페이지 가격에는 사용하지 않습니다.
// 언어와 무관한 값만 둡니다. (화면 문구는 dictionary)
// ─────────────────────────────────────────────────────────────────────

import type { ProgramCourseId, ProgramGroupId } from "./programs";

/** 신규 5개 프로그램 코드 (표시 순서) */
export const PROGRAM_CODES = [
  "REGULAR_ESL",
  "REGULAR_BUSINESS",
  "REGULAR_STUDY_ABROAD",
  "CAMP_SUMMER_WINTER",
  "CAMP_FAMILY",
] as const;

export type ProgramCode = (typeof PROGRAM_CODES)[number];

/** 이전 구조의 프로그램 코드 (삭제하지 않고 보존) */
export const LEGACY_PROGRAM_CODES = ["REGULAR", "CAMP"] as const;

/** 홈페이지 과정 → 프로그램 코드 */
export const COURSE_PROGRAM_CODES: Record<ProgramCourseId, ProgramCode> = {
  intensiveEsl: "REGULAR_ESL",
  business: "REGULAR_BUSINESS",
  studyAbroad: "REGULAR_STUDY_ABROAD",
  summerWinterCamp: "CAMP_SUMMER_WINTER",
  familyCamp: "CAMP_FAMILY",
};

/** 프로그램 코드 → 홈페이지 과정 */
export const PROGRAM_CODE_COURSES: Record<ProgramCode, ProgramCourseId> = {
  REGULAR_ESL: "intensiveEsl",
  REGULAR_BUSINESS: "business",
  REGULAR_STUDY_ABROAD: "studyAbroad",
  CAMP_SUMMER_WINTER: "summerWinterCamp",
  CAMP_FAMILY: "familyCamp",
};

/** 관리자 화면 그룹 (정규반 / 캠프반) */
export const PROGRAM_CODE_GROUPS: Record<ProgramGroupId, readonly ProgramCode[]> = {
  regular: ["REGULAR_ESL", "REGULAR_BUSINESS", "REGULAR_STUDY_ABROAD"],
  camp: ["CAMP_SUMMER_WINTER", "CAMP_FAMILY"],
};

/** 관리자 화면 그룹 제목 (관리자 화면은 한국어 전용) */
export const PROGRAM_GROUP_ADMIN_LABELS: Record<ProgramGroupId, string> = {
  regular: "정규반",
  camp: "캠프반",
};

/** 프로그램 기본 이름 (DB programs.name 이 비어 있을 때만 사용, 관리자 화면 전용) */
export const PROGRAM_CODE_ADMIN_NAMES: Record<ProgramCode, string> = {
  REGULAR_ESL: "인텐시브 ESL",
  REGULAR_BUSINESS: "비즈니스 실무 영어",
  REGULAR_STUDY_ABROAD: "유학 준비",
  CAMP_SUMMER_WINTER: "여름/겨울 방학캠프",
  CAMP_FAMILY: "상시 가족캠프",
};

/** 홈페이지(학비표·맞춤견적서)에 표시하는 기간 옵션 최대 개수 (프로그램별) */
export const MAX_PUBLIC_OPTIONS = 4;

/** 관리자에서 입력할 수 있는 주수 범위 */
export const MIN_DURATION_WEEKS = 1;
export const MAX_DURATION_WEEKS = 104;

/** 홈페이지 표시 순서 입력 범위 */
export const MIN_DISPLAY_ORDER = 1;
export const MAX_DISPLAY_ORDER = 99;

export function isProgramCode(value: string | null | undefined): value is ProgramCode {
  return !!value && (PROGRAM_CODES as readonly string[]).includes(value);
}

export function isLegacyProgramCode(value: string | null | undefined): boolean {
  return !!value && (LEGACY_PROGRAM_CODES as readonly string[]).includes(value);
}
