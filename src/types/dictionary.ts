// src/types/dictionary.ts
// src/dictionaries/*.json 이 반드시 따라야 하는 스키마.
// 새 키를 추가할 때는 이 타입을 먼저 갱신하고, 8개 json 파일 전부에 동일한 키를 추가할 것.

import type { ProgramCourseId } from "@/config/programs";
import type { LocalFeeId } from "@/config/localFees";
import type { InterestId } from "@/config/consultation";

export interface Dictionary {
  meta: {
    /** 브랜드 축약명 (전 언어 공통, 번역하지 않음) */
    siteName: "SYA";
    /** 브랜드 풀네임 (전 언어 공통, 번역하지 않음) */
    siteNameFull: "Special Your Academy";
  };
  /** GNB 6대 대메뉴 */
  nav: {
    about: string;
    programs: string;
    campus: string;
    services: string;
    admission: string;
    community: string;
  };
  /**
   * 메인 히어로 섹션 (단일 대표 이미지, Speaking & Conversation 중심 브랜드 메시지)
   * - sloganMain / sloganSub: 메타데이터(layout.tsx description)용, 화면 비노출
   * - ctaConsult: GNB 헤더 전역 상담 버튼 라벨 (Header.tsx에서 사용)
   */
  hero: {
    sloganMain: string;
    sloganSub: string;
    ctaConsult: string;
    /** 브랜드 모토 "BRIDGING FUTURE THROUGH EDUCATION" (전 언어 공통 영문) */
    motto: string;
    /** 상단 소제목 (전 언어 공통 영문 사용 권장) */
    eyebrow: string;
    /** 헤드라인 1행 (가벼운 서체) */
    headlineLine1: string;
    /** 헤드라인 2행 (강조 서체) */
    headlineLine2: string;
    /** 영문 액센트 문구 (예: "Speaking & Conversation") */
    accent: string;
    /** 설명 문구. "\n"은 데스크톱에서만 줄바꿈으로 표시됨 */
    description: string;
    /** Primary CTA - 상담 신청 모달 열기 */
    ctaPrimary: string;
    /** Secondary CTA - 교육과정 페이지 이동 */
    ctaPrograms: string;
    /** Tertiary CTA - 메인 비용 계산기(#calculator) 이동 */
    ctaCost: string;
    /** 핵심 정보 4종 (value: 영문 메타데이터, label: 현지어 설명) */
    facts: { value: string; label: string }[];
    /** 히어로 하단 trust strip 키워드 */
    trustStrip: string[];
    /** 히어로 대표 이미지 대체 텍스트 */
    imageAlt: string;
  };
  /** 언어 선택 드롭다운 관련 UI 문자열 */
  langSwitcher: {
    label: string;
  };
  /** 메인 랜딩 - Why SYA 섹션 (프리미엄 영어교육 3대 방향) */
  whySya: {
    /** 섹션 제목 (전 언어 공통 "WHY SYA?") */
    title: string;
    subtitle: string;
    /** 카드 순서 = 객체 키 순서 (01 speakingFirst / 02 realEnglishLife / 03 premiumStay) */
    items: {
      speakingFirst: WhySyaItem;
      realEnglishLife: WhySyaItem;
      premiumStay: WhySyaItem;
    };
  };
  /** 메인 LIVE & LEARN IN CEBU 섹션 (WHY SYA? 와 Programs 사이) */
  liveLearn: {
    /** "LIVE & LEARN IN CEBU" (전 언어 공통 영문) */
    eyebrow: string;
    /** "\n"은 데스크톱에서만 줄바꿈 */
    title: string;
    /** 문단 단위 설명 ("\n"은 데스크톱에서만 줄바꿈) */
    description: string[];
    /** 대상 안내 (공식 프로그램은 5세 이상 기준) */
    audienceNote: string;
    /** "세부 한달살기" 상담 버튼 (관심 경험 cebuMonthStay 자동 선택) */
    consultCta: string;
    image: { alt: string; caption: string };
    /** 경험 포인트 (배열이라 항목 추가·삭제가 쉬움) */
    points: LiveLearnPoint[];
    /**
     * 향후 24개월~4세 Family Stay 등 별도 프로그램이 확정되면 추가하는 선택 항목.
     * 값이 없으면 화면에 표시되지 않습니다.
     */
    familyStay?: { label: string; title: string; description: string };
    /**
     * 현지 학교 체험 안내 블록 (LOCAL SCHOOL EXPERIENCE)
     * 학교명이 확정되지 않았으므로 특정 학교명·학교 링크를 쓰지 않음.
     * 제휴·공식 파트너십으로 표현하지 않음 (학교와의 협의 및 운영 조건에 따라 안내).
     */
    school: {
      /** "LOCAL SCHOOL EXPERIENCE" (전 언어 공통 영문) */
      eyebrow: string;
      /** 블록 제목 (한국어: "현지 학교 체험") */
      title: string;
      tagline: string;
      description: string;
      /** 참여 가능 여부·일정 안내 문구 */
      conditionNote: string;
      /** 사진 대체 텍스트 (학교명 없이) */
      imageAlt: string;
    };
  };
  /** 교육과정 - 메인 Our Programs 섹션 + 프로그램 상세 페이지 공통 */
  programs: {
    /** "OUR PROGRAMS" (전 언어 공통 영문) */
    eyebrow: string;
    /** "\n"은 데스크톱에서만 줄바꿈 */
    title: string;
    subtitle: string;
    viewAll: string;
    learnMore: string;
    /** 공통 연수기간 (2·4·8·12주) */
    duration: ProgramInfoItem;
    /** 공통 학습시간 (UP TO 4 HOURS / DAY — 하루 최대 4시간의 1:1 맨투맨 수업을 중심으로, 학습과 생활이 자연스럽게 이어지는 하루 약 8시간의 영어 프로그램) */
    classHours: ProgramInfoItem;
    audienceLabel: string;
    familyOptionsLabel: string;
    groups: {
      regular: ProgramGroupText & {
        /** 정규반 전용 개강일 (캠프반에는 적용하지 않음) */
        openings: ProgramInfoItem;
      };
      camp: ProgramGroupText;
    };
    courses: Record<ProgramCourseId, ProgramCourse>;
    /** REGULAR PROGRAMS 카테고리 페이지 (/[lang]/programs/regular) */
    regularPage: {
      /** 히어로 Breadcrumb 마지막 항목 (선택 — 없으면 groups.regular.label 영문 사용) */
      breadcrumbLabel?: string;
      /** 히어로 Eyebrow (선택 — 없으면 groups.regular.label 영문 사용) */
      heroLabel?: string;
      /** "\n"은 데스크톱에서만 줄바꿈 */
      description: string;
      /** "OUR REGULAR PROGRAMS" (전 언어 공통 영문) */
      listEyebrow: string;
      listTitle: string;
      /** 이 페이지용 영문 과정명·짧은 설명 (없으면 courses의 값 사용) */
      programs: Partial<Record<ProgramCourseId, { englishName: string; summary: string }>>;
      /** Study Abroad 카드에만 짧게 표시 (전 언어 공통 영문) */
      localSchoolTag: string;
      howYouLearn: {
        /** "HOW YOU LEARN" (전 언어 공통 영문) */
        eyebrow: string;
        /** SPEAKING → CONVERSATION → REAL LIFE → CONFIDENCE (전 언어 공통 영문) */
        steps: string[];
        description: string;
      };
      /** "PROGRAM INFORMATION" (전 언어 공통 영문) */
      infoEyebrow: string;
      closingTitle: string;
    };
    /** CAMP PROGRAMS 카테고리 페이지 (/[lang]/programs/camp) */
    campPage: {
      /** 히어로 Breadcrumb 마지막 항목 (선택 — 없으면 groups.camp.label 영문 사용) */
      breadcrumbLabel?: string;
      /** 히어로 Eyebrow (선택 — 없으면 groups.camp.label 영문 사용) */
      heroLabel?: string;
      /** "\n"은 데스크톱에서만 줄바꿈 */
      description: string;
      consultCta: string;
      /** "OUR CAMP PROGRAMS" (전 언어 공통 영문) */
      listEyebrow: string;
      listTitle: string;
      programs: Partial<Record<ProgramCourseId, { englishName: string; summary: string; imageAlt: string }>>;
      /** WHAT MAKES SYA CAMP DIFFERENT? (label은 전 언어 공통 영문) */
      different: { eyebrow: string; items: { label: string; text: string }[] };
      /** A DAY AT SYA CAMP: 시간표가 아닌 경험의 흐름 */
      day: { eyebrow: string; steps: { label: string; text: string }[]; note: string };
      stayMeals: {
        eyebrow: string;
        stay: CampStayMealsItem;
        meals: CampStayMealsItem;
      };
      family: {
        eyebrow: string;
        message: string;
        /** 가족 구성 영문 라벨 (현지어는 courses.familyCamp.familyOptions 사용) */
        optionLabels: string[];
      };
      infoEyebrow: string;
      /** 캠프 일정 (확정된 운영 기준만, 구체 날짜는 상담 안내) */
      schedule: ProgramInfoItem;
      closingTitle: string;
      closingSummerCta: string;
      closingFamilyCta: string;
      operations?: {
        eyebrow: string;
        title: string;
        intro: string;
        levelTitle: string;
        levelIntro: string;
        levels: [string, string, string][];
        dayTitle: string;
        dayIntro: string;
        schedule: [string, string][];
        levelOpsTitle: string;
        levelOps: [string, string][];
        careTitle: string;
        care: string[];
        weeklyTitle: string;
        weekly: [string, string][];
        outcomesTitle: string;
        outcomes: string[];
        careTeamTitle: string;
        careTeamIntro: string;
        roles: string[];
      };
    };
    /** 홈 PROGRAMS: REGULAR / CAMP 두 가지 "SYA 경험" 선택 영역 */
    experience: {
      /** "PROGRAMS" (전 언어 공통 영문) */
      eyebrow: string;
      title: string;
      includesLabel: string;
      regular: ProgramExperienceText;
      camp: ProgramExperienceText;
    };
    /** 프로그램 상세 페이지 전용 UI 문구 */
    detail: {
      pageTitle: string;
      pageSubtitle: string;
      breadcrumbHome: string;
      purposeLabel: string;
      audienceLabel: string;
      directionLabel: string;
      focusAreasLabel: string;
      durationLabel: string;
      classHoursLabel: string;
      openingsLabel: string;
      timetableLabel: string;
      /** 시간표가 아직 없는 과정에 표시하는 안내 */
      timetablePending: string;
      timeHeader: string;
      subjectHeader: string;
      consultTitle: string;
      consultDescription: string;
      consultCta: string;
      /**
       * LOCAL SCHOOL EXPERIENCE 안내 블록 (config/programs.ts의 LOCAL_SCHOOL_EXPERIENCE_COURSES 과정에만 표시)
       * 학교명 미확정: 특정 학교명·학교 링크를 쓰지 않고, 제휴·공식 파트너십으로 표현하지 않음
       */
      localSchool: {
        /** "LOCAL SCHOOL EXPERIENCE" (전 언어 공통 영문) */
        label: string;
        title: string;
        description: string;
        /** 참여 가능 여부·일정: 현지 학교와의 협의 및 프로그램 운영 조건에 따라 안내 */
        conditionNote: string;
        /** 상담 버튼 (해당 과정 + 관심 경험 localSchool 자동 선택) */
        consultCta: string;
      };
    };
  };
  /** 학비 안내 (메인 Tuition 섹션 + 연수비용 페이지 학비표 공통) */
  tuition: {
    /** "TUITION" (전 언어 공통 영문) */
    eyebrow: string;
    /** "\n"은 데스크톱에서만 줄바꿈 */
    title: string;
    description: string;
    durationLabel: string;
    /** 기간 표시 (2/4/8/12주) */
    weeks: Record<"2" | "4" | "8" | "12", string>;
    tuitionFeeLabel: string;
    allDurationsLabel: string;
    /** 미정 금액 표시 */
    onRequest: string;
    /** 가족캠프 가격 기준 표기 */
    perChild: string;
    familyParentNote: string;
    notes: string[];
    consultCta: string;
    calculatorCta: string;
  };
  /** 예상 비용 계산기 + 상담 모달 공통 선택지 */
  estimator: {
    title: string;
    subtitle: string;
    steps: {
      course: string;
      duration: string;
      participant: string;
      stay: string;
      parents: string;
    };
    participantTypes: { adult: string; student: string };
    childCountLabel: string;
    parentCountLabel: string;
    stayOptions: { included: string; none: string };
    stayNote: string;
    summaryTitle: string;
    lines: {
      tuition: string;
      additionalChild: string;
      parent: string;
      stay: string;
      option: string;
    };
    educationSubtotal: string;
    totalLabel: string;
    knownTotalLabel: string;
    totalNote: string;
    consultCta: string;
  };
  /** 메인 Accommodation 섹션 (BE Pods Lahug, 우선 숙소) */
  accommodation: {
    /** 생활 챕터 라벨 "STAY & LIVE IN CEBU" (전 언어 공통 영문) */
    chapterLabel: string;
    /** "ACCOMMODATION" 등 영문 eyebrow·캡션은 전 언어 공통 */
    eyebrow: string;
    title: string;
    /** "\n"은 데스크톱에서만 줄바꿈 */
    subtitle: string;
    description: string;
    lobby: AccommodationPhotoText;
    stay: AccommodationBlockText & { photo: AccommodationPhotoText };
    facilities: AccommodationBlockText & { photo: AccommodationPhotoText };
    convenience: AccommodationBlockText & {
      gym: AccommodationPhotoText & { text: string };
      laundry: AccommodationPhotoText & { text: string };
    };
    gallery: {
      eyebrow: string;
      title: string;
      poolCourtyard: AccommodationPhotoText;
      bedroom: AccommodationPhotoText;
      poolLifestyle: AccommodationPhotoText;
    };
    /** 추가 숙소 (Priority 2) - 간결하게만 표시 */
    additional: { eyebrow: string; name: string; description: string };
    closing: AccommodationBlockText & { imageAlt: string };
  };
  /** 연수비용 페이지 - 현지 납부비용 탭 */
  localFees: {
    title: string;
    subtitle: string;
    heading: string;
    description: string;
    columns: { item: string; amount: string; note: string };
    /** 금액 미확정 표시 */
    onRequest: string;
    items: Record<LocalFeeId, { name: string; note: string }>;
    depositBox: { title: string; description: string };
    paymentBox: { title: string; description: string };
  };
  /** 상담 신청 모달 - 새로 추가된 항목 (기존 모달 문구는 ConsultationModal.tsx 내부에 유지) */
  consultation: {
    /** "관심 있는 경험" */
    interestsLabel: string;
    /** 관심 경험 선택지 (config/consultation.ts의 INTEREST_IDS) */
    interests: Record<InterestId, string>;
    /** 선택 없음 표시 (제출 텍스트용) */
    noneLabel: string;
  };
  /** 6대 메뉴 하위 페이지의 "준비 중" 뼈대 화면에 쓰이는 공통 문구 */
  comingSoon: {
    badge: string;
    message: string;
    backHome: string;
  };
}

/** Why SYA 카드 1개 */
export interface WhySyaItem {
  /** 영문 제목 (전 언어 공통, 예: "Speaking First") */
  englishTitle: string;
  /** 현지어 제목 */
  title: string;
  description: string;
}

/** 교육과정 공통 정보 1건 (label/value는 영문 메타데이터, localized는 현지어) */
export interface ProgramInfoItem {
  label: string;
  value: string;
  localized: string;
}

/** 정규반/캠프반 그룹 소개 */
export interface ProgramGroupText {
  /** "REGULAR PROGRAMS" / "CAMP PROGRAMS" (전 언어 공통 영문) */
  label: string;
  title: string;
  description: string;
}

/** 교육과정 1개 */
export interface ProgramCourse {
  /** 영문 과정명 (전 언어 공통, 예: "INTENSIVE ESL") */
  englishName: string;
  name: string;
  /** 카드/상세 상단의 짧은 설명 */
  summary: string;
  /** 핵심 키워드 (전 언어 공통 영문) */
  keywords: string[];
  /** 추천 대상 */
  audience: string;
  /** 과정 목적 */
  purpose: string;
  /** 교육 방향 */
  direction: string;
  /** 주요 학습 영역 (title은 영문 공통) */
  focusAreas: { title: string; description: string }[];
  /** 가족캠프 전용: 가족 구성 선택지 */
  familyOptions?: string[];
  /** 실제 시간표 확정 후 입력 (수업은 하루 최대 4시간). 없으면 상세 페이지에 안내 문구 표시 */
  timetable?: { time: string; subject: string }[];
}

/** Accommodation 사진 1장의 캡션(영문 공통)과 대체 텍스트 */
export interface AccommodationPhotoText {
  caption: string;
  alt: string;
}

/** Accommodation 소섹션 제목 묶음 */
export interface AccommodationBlockText {
  eyebrow: string;
  /** "\n"은 데스크톱에서만 줄바꿈 */
  title: string;
  description: string;
}

/** LIVE & LEARN IN CEBU 경험 포인트 1개 */
export interface LiveLearnPoint {
  /** 영문 라벨 (전 언어 공통, 예: "ENGLISH CONVERSATION") */
  label: string;
  title: string;
  /** "\n"은 데스크톱에서만 줄바꿈 */
  description: string;
}

/** 홈 PROGRAMS의 REGULAR / CAMP 경험 소개 */
export interface ProgramExperienceText {
  /** 대표 영어 문구 (전 언어 공통 영문) */
  tagline: string;
  /** "\n"은 데스크톱에서만 줄바꿈 */
  description: string;
  imageAlt: string;
}

/** CAMP 페이지 STAY / MEALS 항목 */
export interface CampStayMealsItem {
  /** "STAY" / "MEALS" (전 언어 공통 영문) */
  label: string;
  name: string;
  /** "\n"은 데스크톱에서만 줄바꿈 */
  description: string;
  imageAlt: string;
}

/* ==================================================================== */
/* 필리핀 생활안내 (/[lang]/campus) 전용 사전                              */
/* src/dictionaries/campus/*.json 이 따라야 하는 스키마 (8개 언어 동일 구조) */
/* 분량이 커서 기본 Dictionary와 분리하고, campus 페이지에서만 불러온다.       */
/* ==================================================================== */

/** 점심 / 저녁 세트 메뉴 1개 */
export interface CampusMealSet {
  title: string;
  tags: string[];
  desc: string;
}

/** 다국적 전통음식 Day 국가 1개 (국기는 컴포넌트에서 순서대로 매칭) */
export interface CampusCountryMeal {
  name: string;
  desc: string;
  menu: string;
}

/** 주간 식단표 1행 (목요일 강조 표시는 컴포넌트에서 처리) */
export interface CampusWeeklyRow {
  day: string;
  breakfast: string;
  lunch: string;
  dinner: string;
}

/** 액티비티 투어 1개 (slug·카테고리·영문 배지는 컴포넌트의 TOUR_META와 순서대로 매칭) */
export interface CampusTour {
  difficulty: string;
  title: string;
  location: string;
  duration: string;
  desc: string;
  highlights: string[];
  schedule: string;
}

export interface CampusDictionary {
  page: {
    title: string;
    subtitle: string;
    /** "{n}" 자리에 조식 구성 번호가 들어감 */
    breakfastComboLabel: string;
    difficultyLabel: string;
    activityImageAlt: string;
  };
  /** 생활안내 페이지 좌측의 상담 카드 문구 */
  consultCard: {
    title: string;
    phoneLabel: string;
    kakaoLabel: string;
    ctaButton: string;
    accreditation: string;
  };
  meals: {
    sidebarTitle: string;
    heroBadge: string;
    heroHeading: string;
    heroDesc: string;
    timeLabels: { breakfast: string; lunch: string; dinner: string };
    timeValues: { breakfast: string; lunch: string; dinner: string };
    checklist: string[];
    tabs: {
      lunch: string;
      dinner: string;
      breakfast: string;
      globalDay: string;
      fruit: string;
      weekly: string;
    };
    lunchGalleryTitle: string;
    lunchGallerySubtitle: string;
    dinnerGalleryTitle: string;
    dinnerGallerySubtitle: string;
    breakfastHeading: string;
    breakfastDesc: string;
    breakfastAlwaysTitle: string;
    globalDayHeading: string;
    globalDayDesc: string;
    globalDayMenuLabel: string;
    fruitHeading: string;
    fruitDesc: string;
    fruitCaptions: string[];
    weeklyHeading: string;
    weeklyNote: string;
    weeklyDayHeader: string;
    weeklyBreakfastHeader: string;
    weeklyLunchHeader: string;
    weeklyDinnerHeader: string;
    safetyHeading: string;
    safetyBullets: string[];
  };
  lunchSets: CampusMealSet[];
  dinnerSets: CampusMealSet[];
  breakfastCombos: string[];
  breakfastAlways: string[];
  globalDayCountries: CampusCountryMeal[];
  weeklyTable: CampusWeeklyRow[];
  activities: {
    sidebarTitle: string;
    heroBadge: string;
    heroHeading: string;
    heroDesc: string;
    heroBoxLabel: string;
    heroBoxValue: string;
    heroBoxNote: string;
    checklist: string[];
    filters: { all: string; marine: string; history: string; waterpark: string };
    galleryLabel: string;
    highlightsLabel: string;
    scheduleLabel: string;
    applyLabel: string;
    applyValue: string;
    minGroupLabel: string;
    minGroupValue: string;
    safetyHeading: string;
    safetyBullets: string[];
  };
  tours: CampusTour[];
  visa: {
    sidebarTitle: string;
    heading: string;
    items: { title: string; desc: string }[];
    /** "제목: 본문" 형식 (첫 번째 ":" 앞이 굵은 제목) */
    warning: string;
  };
  pickup: {
    sidebarTitle: string;
    heading: string;
    cards: { tag: string; title: string; bullets: string[] }[];
    hotlineTitle: string;
    hotlineDesc: string;
  };
  localLife: {
    sidebarTitle: string;
    heading: string;
    cards: { label: string; value: string; note: string }[];
    /** "제목: 본문" 형식 (첫 번째 ":" 앞이 굵은 제목) */
    bullets: string[];
  };
  packing: {
    sidebarTitle: string;
    heading: string;
    categories: { title: string; items: string[] }[];
  };
}

/* ------------------------------------------------------------------ */
/* ADHD 맞춤형 영어교육 (ADHD-Friendly English Learning)                  */
/* src/dictionaries/adhd/*.json 이 따라야 하는 스키마 (8개 언어 모두 같은 키) */
/* 메인 소개 카드(home) + 상세 페이지(page) + 상담 팝업 표시 문구(consultation) */
/* ------------------------------------------------------------------ */
export interface AdhdDictionary {
  meta: {
    /** 상세 페이지 <title> (레이아웃 템플릿 "%s | SYA"가 뒤에 붙음) */
    title: string;
    description: string;
  };
  /** 메인 페이지 OUR PROGRAMS 아래 소개 카드 */
  home: {
    /** 영문 프로그램명 (전 언어 공통 영문) */
    englishTitle: string;
    title: string;
    description: string;
    /** 4개 */
    points: string[];
    cta: string;
    imageAlt: string;
  };
  /** 상세 페이지 /[lang]/programs/adhd */
  page: {
    /** Breadcrumb 마지막 항목 (HOME · 교육과정은 기본 사전 programs.detail 값을 그대로 사용) */
    breadcrumbCurrent: string;
    hero: {
      title: string;
      /** 영문 프로그램명 (전 언어 공통 영문) */
      englishTitle: string;
      copy: string;
      description: string;
      cta: string;
    };
    approach: {
      title: string;
      /** 4개: 개별 학습 목표 / 단계별 학습 / 수업 방식 조정 / 긍정적인 피드백 */
      items: { title: string; description: string }[];
    };
    formats: {
      title: string;
      /** 2개: 1:1 개인 맞춤 수업 / 소규모 그룹 수업 */
      items: { title: string; points: string[]; imageAlt: string }[];
      /** 그룹 정원·시간·비용 미확정 안내 */
      note: string;
    };
    audience: {
      title: string;
      description: string;
      note: string;
    };
    process: {
      title: string;
      /** 4단계 */
      steps: string[];
    };
    faq: {
      title: string;
      /** 5개 */
      items: { question: string; answer: string }[];
    };
    cta: {
      title: string;
      description: string;
      button: string;
    };
    /** 의료·치료 서비스가 아닌 영어교육 프로그램임을 밝히는 안내 */
    disclaimer: string;
  };
  /** 상담 팝업을 ADHD 페이지에서 열었을 때만 표시되는 문구 */
  consultation: {
    /** 팝업 제목 (기존 공용 제목 "무료 견적서 및 입학 상담 접수" 대신) */
    title: string;
    notice: string;
    studentAgeLabel: string;
    studentAgePlaceholder: string;
    classFormatLabel: string;
    /** 희망 수업 형태: 1:1 / 소규모 그룹 / 상담 후 결정 */
    classFormats: { oneOnOne: string; smallGroup: string; undecided: string };
    /** 영어 수준 항목 이름 (기존 "본인의 영어 수준" 대신 학생 기준) */
    levelLabel: string;
    goalLabel: string;
    goalPlaceholder: string;
    messagePlaceholder: string;
  };
}
