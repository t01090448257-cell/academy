// src/config/courses.ts
// 학비표·비용 계산기·상담 모달이 공유하는 과정/숙박 선택 ID 정의처입니다.
// 과정 ID는 교육과정(config/programs.ts)의 5개 과정과 동일합니다.

import { PROGRAM_COURSE_IDS, type ProgramCourseId } from "./programs";

/** 운영 중인 5개 과정 (정규반 3 + 캠프반 2) */
export const COURSE_IDS = PROGRAM_COURSE_IDS;
export type CourseId = ProgramCourseId;

export function isCourseId(value: string | null | undefined): value is CourseId {
  return !!value && (COURSE_IDS as readonly string[]).includes(value);
}

/** 숙박 여부 (숙소 배정·객실 타입은 상담/예약 단계에서 결정) */
export const STAY_OPTION_IDS = ["included", "none"] as const;
export type StayOptionId = (typeof STAY_OPTION_IDS)[number];

/** 정규반 참가자 구분 (현재 가격 차이 없음, 추후 참가자별 가격 확장용) */
export const PARTICIPANT_TYPE_IDS = ["adult", "student"] as const;
export type ParticipantTypeId = (typeof PARTICIPANT_TYPE_IDS)[number];
