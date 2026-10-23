// src/lib/publicTuition.ts
// ─────────────────────────────────────────────────────────────────────
// 홈페이지 공개 교육비 데이터 (연수비용 학비표 + 실시간 맞춤견적서 + 상담 모달이 함께 사용하는 단 하나의 원천)
//
// 데이터 흐름
//   관리자 > 프로그램 관리 (program_options.is_public / display_order + program_prices 이력)
//     → PostgreSQL
//     → 빌드 시 loadPublicTuition() (src/lib/publicTuition.server.ts) 가 현재 적용 가격을 읽음
//     → [lang]/layout.tsx 의 PublicTuitionProvider
//     → TuitionSection(학비표) / CostCalculator(맞춤견적서) / ConsultationModal(희망 기간)
//
// 이 파일은 DB를 직접 읽지 않는 순수 함수·타입만 둡니다. (브라우저 번들에 포함되어도 안전)
// 홈페이지를 서버 방식으로 바꾸면 loadPublicTuition() 호출 위치만 바꾸면 됩니다. (화면 코드는 그대로)
//
// 규칙
//   - 홈페이지 표시(is_public)가 켜진 기간만, 프로그램별 최대 4개(MAX_PUBLIC_OPTIONS)
//   - 오늘 적용되는 활성 KRW 가격이 있는 기간만 (가격이 없으면 표시하지 않음, 임의 계산·대체값 없음)
//   - 순서: 표시 순서(display_order) → 주수
// ─────────────────────────────────────────────────────────────────────

import { PROGRAM_COURSE_IDS, type ProgramCourseId } from "@/config/programs";
import { MAX_PUBLIC_OPTIONS } from "@/config/programPricing";

/** 홈페이지에 표시되는 기간 1개와 그 교육비 */
export interface PublicDurationPrice {
  /** 주수 (관리자가 입력한 값 그대로) */
  weeks: number;
  /** 원화 정수 */
  price: number;
}

export interface PublicTuitionData {
  /** 가격 기준일 (한국 시간 YYYY-MM-DD, 빌드한 날) */
  date: string;
  /** 과정별 표시 기간 (최대 4개, 표시 순서대로) */
  courses: Record<ProgramCourseId, PublicDurationPrice[]>;
}

/** 표시 후보 1건 (DB에서 읽은 값 그대로) */
export interface PublicOptionCandidate {
  optionId: string;
  weeks: number;
  isPublic: boolean;
  isActive: boolean;
  displayOrder: number | null;
  /** 오늘 적용되는 가격 (기존 findCurrentPrice 규칙으로 고른 1건). 없으면 null */
  currentPrice: { price: string; currency: string } | null;
}

export function emptyPublicTuition(date: string): PublicTuitionData {
  const courses = {} as Record<ProgramCourseId, PublicDurationPrice[]>;
  for (const id of PROGRAM_COURSE_IDS) courses[id] = [];
  return { date, courses };
}

/** "3160000" / "3160000.00" → 3160000 (원화 정수가 아니거나 0 이하면 null) */
function toWon(value: string): number | null {
  const text = value.trim().replace(/\.0+$/, "");
  if (!/^\d+$/.test(text)) return null;
  const amount = Number(text);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

/**
 * 한 프로그램의 기간 옵션 후보 → 홈페이지 표시 목록
 * 홈페이지 표시 O + 기간 활성 + 오늘 적용 KRW 가격 있음 → 표시 순서 → 주수 → 최대 4개
 */
export function selectPublicOptions(candidates: PublicOptionCandidate[]): PublicDurationPrice[] {
  const rows: PublicDurationPrice[] = [];
  const seenWeeks = new Set<number>();

  const sorted = [...candidates].sort((a, b) => {
    const ao = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const bo = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    if (a.weeks !== b.weeks) return a.weeks - b.weeks;
    return a.optionId < b.optionId ? -1 : 1;
  });

  for (const option of sorted) {
    if (!option.isPublic || !option.isActive) continue;
    if (!Number.isInteger(option.weeks) || option.weeks <= 0) continue;
    if (!option.currentPrice || option.currentPrice.currency.trim().toUpperCase() !== "KRW") continue;
    const price = toWon(option.currentPrice.price);
    if (price === null) continue;
    if (seenWeeks.has(option.weeks)) continue; // DB 고유 조건상 없지만 방어
    seenWeeks.add(option.weeks);
    rows.push({ weeks: option.weeks, price });
    if (rows.length >= MAX_PUBLIC_OPTIONS) break;
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/* 화면에서 쓰는 조회 도우미                                             */
/* ------------------------------------------------------------------ */

/** 과정의 홈페이지 표시 기간 목록 */
export function getCourseDurations(data: PublicTuitionData, courseId: ProgramCourseId): PublicDurationPrice[] {
  return data.courses[courseId] ?? [];
}

/** 과정·기간의 교육비. 해당 기간이 표시 대상이 아니면 null (임의 계산하지 않음) */
export function getCourseTuition(data: PublicTuitionData, courseId: ProgramCourseId, weeks: number | null): number | null {
  if (weeks === null) return null;
  return getCourseDurations(data, courseId).find((row) => row.weeks === weeks)?.price ?? null;
}

/**
 * 선택한 기간이 이 과정에 없을 때 대신 보여줄 기간
 * (원하는 기간 → 4주 → 첫 번째 표시 기간 순, 하나도 없으면 null)
 */
export function resolveCourseWeeks(
  data: PublicTuitionData,
  courseId: ProgramCourseId,
  preferred: number | null | undefined
): number | null {
  const rows = getCourseDurations(data, courseId);
  if (preferred !== null && preferred !== undefined && rows.some((row) => row.weeks === preferred)) return preferred;
  return rows.find((row) => row.weeks === 4)?.weeks ?? rows[0]?.weeks ?? null;
}
