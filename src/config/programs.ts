// src/config/programs.ts
// 교육과정(Our Programs) 5개 과정의 id·그룹·대표 이미지를 한 곳에서 관리한다.
// 문구는 모두 dictionary(dict.programs.courses)에 있고, 여기에는 언어와 무관한 값만 둔다.

export const PROGRAM_COURSE_IDS = [
  "intensiveEsl",
  "business",
  "studyAbroad",
  "summerWinterCamp",
  "familyCamp",
] as const;

export type ProgramCourseId = (typeof PROGRAM_COURSE_IDS)[number];

export type ProgramGroupId = "regular" | "camp";

/** 정규반 3개 / 캠프반 2개 (표시 순서 그대로) */
export const PROGRAM_GROUPS: Record<ProgramGroupId, readonly ProgramCourseId[]> = {
  regular: ["intensiveEsl", "business", "studyAbroad"],
  camp: ["summerWinterCamp", "familyCamp"],
};

export const PROGRAM_GROUP_ORDER: readonly ProgramGroupId[] = ["regular", "camp"];

/** 과정별 대표 이미지 */
export const PROGRAM_IMAGES: Record<ProgramCourseId, string> = {
  intensiveEsl: "/images/sya-photos/general-english.png",
  business: "/images/sya-photos/business-english.png",
  studyAbroad: "/images/sya-photos/one-on-one.png",
  summerWinterCamp: "/images/sya-photos/junior-camp.png",
  familyCamp: "/images/sya-photos/junior-family.png",
};

export const DEFAULT_PROGRAM_COURSE: ProgramCourseId = "intensiveEsl";

export function isProgramCourseId(value: string | null | undefined): value is ProgramCourseId {
  return !!value && (PROGRAM_COURSE_IDS as readonly string[]).includes(value);
}

export function getProgramGroup(id: ProgramCourseId): ProgramGroupId {
  return PROGRAM_GROUPS.regular.includes(id) ? "regular" : "camp";
}

/** 과정 상세 페이지 링크 (?tab= 값은 ProgramCourseId와 정확히 일치) */
export function programHref(lang: string, id: ProgramCourseId): string {
  return `/${lang}/programs?tab=${id}`;
}

/**
 * LOCAL SCHOOL EXPERIENCE (현지 학교 체험 — 선택 경험, 특정 학교명은 표시하지 않음)를 안내하는 과정.
 * 과정 상세 페이지에서 이 목록에 있는 과정만 안내 블록을 표시합니다.
 * 학사 일정·참여 가능 여부가 확인되면 여기에 과정 ID를 추가하면 됩니다. (예: "summerWinterCamp")
 */
export const LOCAL_SCHOOL_EXPERIENCE_COURSES: readonly ProgramCourseId[] = ["familyCamp", "studyAbroad"];

export function hasLocalSchoolExperience(id: ProgramCourseId): boolean {
  return LOCAL_SCHOOL_EXPERIENCE_COURSES.includes(id);
}


/**
 * 카테고리 랜딩 페이지가 있는 그룹 (정적 경로 /[lang]/programs/<slug>)
 * CAMP 페이지가 생기면 camp: "camp" 를 추가하면 홈 CAMP "자세히 보기"도 자동으로 연결됩니다.
 */
export const PROGRAM_CATEGORY_SLUGS: Partial<Record<ProgramGroupId, string>> = {
  regular: "regular",
  camp: "camp",
};

/** 카테고리 페이지 링크. 페이지가 없는 그룹은 null */
export function programCategoryHref(lang: string, group: ProgramGroupId): string | null {
  const slug = PROGRAM_CATEGORY_SLUGS[group];
  return slug ? `/${lang}/programs/${slug}` : null;
}
