"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Locale } from "@/config/i18n";
import ConsultSidebarCard from "@/components/common/ConsultSidebarCard";
import { useConsultationModal } from "@/components/common/ConsultationModalProvider";
import { useSiteContact } from "@/components/common/SiteContactProvider";
import { officeMapEmbedSrc, toTelHref } from "@/lib/siteContact";

interface AboutContentProps {
  lang: Locale;
}

type TabId = "overview" | "facility" | "location" | "director" | "faculty";

/* ------------------------------------------------------------------ */
/* 아이콘 (외부 의존성 없는 인라인 SVG)                                    */
/* ------------------------------------------------------------------ */
function IconGraduationCap() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 9l10-5 10 5-10 5-10-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M6 11v5c0 1.4 2.7 3 6 3s6-1.6 6-3v-5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M22 9v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconHeart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20s-7.5-4.6-9.8-9.1C.6 7.5 2.4 4 6 4c2 0 3.5 1.1 4.3 2.5C11.1 5.1 12.6 4 14.6 4c3.6 0 5.4 3.5 3.8 6.9C19.5 15.4 12 20 12 20Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17.5" cy="8.5" r="2.5" stroke="currentColor" strokeWidth="1.6" opacity="0.6" />
      <path d="M14.8 20c.2-2.9 2.2-5 4.7-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}
function IconChevron() {
  return (
    // RTL(ar)에서만 좌우 반전되어 진행 방향(←)을 가리킨다. LTR 언어에는 영향 없음
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="rtl:-scale-x-100">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22s7-6.6 7-12a7 7 0 1 0-14 0c0 5.4 7 12 7 12Z" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconPlane() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 13l7-2 5-8 2 1-3 8 6-1 2 2-7 3-2 6-2-1 1-6-5 2-2-2 3-2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 10.5l2.5 2.5L14 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconAward() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 12.5L7 21l5-2.5L17 21l-1.5-8.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/* 왼쪽 메뉴 순서 + 아이콘 + 고정 영문 캡션(사이트 언어와 무관하게 항상 영문 유지) */
const TAB_META: { id: TabId; caption: string; icon: React.ReactNode }[] = [
  { id: "overview", caption: "About SYA", icon: <IconGraduationCap /> },
  { id: "director", caption: "Director's Message", icon: <IconHeart /> },
  { id: "faculty", caption: "Faculty System", icon: <IconUsers /> },
  { id: "facility", caption: "Campus & Facilities", icon: <IconShield /> },
  { id: "location", caption: "Location & Map", icon: <IconPin /> },
];

// 학원소개(overview) 우측 대표 이미지
const OVERVIEW_IMAGE = "/images/sya-photos/one-on-one.png";
// 원장 인사말(director) 프로필 사진
const DIRECTOR_IMAGE =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80";
// 캠퍼스 시설(facility) 카드 3장 이미지 (순서: 1:1 큐비클 / 수영장&카페 / 24시간 독서실)
const FACILITY_IMAGES = [
  "/images/sya-photos/facility/facility-cubicle.png",
  "/images/sya-photos/facility/facility-pool.png",
  "/images/sya-photos/facility/facility-studyroom.png",
];

const FACULTY_ICON_MAP: Record<string, React.ReactNode> = {
  award: <IconAward />,
  users: <IconUsers />,
  shield: <IconShield />,
};
const FACULTY_ICON_BG: Record<string, string> = {
  award: "bg-sky-100 text-sky-700",
  users: "bg-amber-100 text-amber-700",
  shield: "bg-emerald-100 text-emerald-700",
};

/* ------------------------------------------------------------------ */
/* 내부 번역 맵 (8개 언어 전체 지원)                                       */
/* ------------------------------------------------------------------ */
interface AboutCopy {
  pageBadge: string;
  pageTitle: string;
  pageSubtitle: string;
  sidebarTitles: Record<TabId, string>;
  overview: {
    badge: string;
    heading: string;
    paragraphs: string[];
    checklist: { title: string; description: string }[];
    imageBadge: string;
    imageCaption: string;
  };
  director: {
    badge: string;
    quote: string;
    name: string;
    paragraphs: string[];
    closing: string;
  };
  faculty: {
    heading: string;
    subtitle: string;
    cards: { icon: string; title: string; description: string }[];
  };
  facility: {
    heading: string;
    subtitle: string;
    cards: { title: string; description: string }[];
  };
  location: {
    badge: string;
    heading: string;
    paragraph: string;
    infoCards: { title: string; description: string }[];
    darkBox: {
      addressBadge: string;
      campusName: string;
      /** 필리핀 캠퍼스 주소 라벨 (주소 값은 관리자 설정 address) */
      campusAddressLabel: string;
      /** 필리핀 사무소 주소 라벨 (주소 값은 관리자 설정 philippines_office_address) */
      officeAddressLabel: string;
      phoneKoreaLabel: string;
      phonePhLabel: string;
      kakaoLabel: string;
      kakao: string;
    };
    ctaLabel: string;
  };
}

const translations: Record<Locale, AboutCopy> = {
  ko: {
    pageBadge: "About SYA",
    pageTitle: "학원소개",
    pageSubtitle: "정규 TESDA 인가와 검증된 강사진으로 완성하는 세부 명문 어학연수",
    sidebarTitles: {
      overview: "SYA 어학원 소개",
      director: "원장 인사말",
      faculty: "전문 강사진 시스템",
      facility: "캠퍼스 시설 & 안전",
      location: "오시는 길 (캠퍼스 위치)",
    },
    overview: {
      badge: "FOUNDATION & VISION",
      heading: "단순한 어학연수가 아닌, 인생의 터닝포인트를 만드는 교육",
      paragraphs: [
        "SYA(Special Your Academy)는 필리핀의 대표적인 휴양 및 교육 중심지 세부(Cebu)에 프리미엄 캠퍼스를 두고 운영되는 명문 어학원입니다.",
        "한국 학생들이 영어 회화에서 겪는 가장 큰 장벽인 '발화 기회의 부족'과 '두려움'을 해결하기 위해, 하루 최대 4시간의 1:1 맨투맨 집중 수업과 원어민 스피치 코칭을 결합한 몰입형 교수법을 정착시켰습니다.",
      ],
      checklist: [
        { title: "필리핀 정부 TESDA 정식 인가 학원", description: "필리핀 기술교육청(TESDA) 정식 인증을 획득하여 법적 안전성과 커리큘럼의 공신력을 보장합니다." },
        { title: "이민국 정식 SSP 공인 허가 기관", description: "합법적인 학생 체류 허가증(SSP)을 학원에서 직접 발급 대행하여 비자 걱정 없이 학업에 몰입할 수 있습니다." },
        { title: "안전한 리조트형 클로즈드 캠퍼스", description: "24시간 안전 가드 및 CCTV 상시 가동, 한국인 매니저가 기숙사에 상주하는 토탈 케어 시스템입니다." },
      ],
      imageBadge: "1:1 Premium Mentoring",
      imageCaption: "학생 한 명 한 명에게 완전히 집중하는 SYA만의 1:1 맨투맨 케어",
    },
    director: {
      badge: "DIRECTOR'S MESSAGE",
      quote: "여러분의 용기 있는 도전이 눈부신 결실을 맺도록 지원하겠습니다.",
      name: "SYA(Special Your Academy) 원장 & 교직원 일동",
      paragraphs: [
        "안녕하십니까, SYA 어학원을 찾아주신 학생 및 학부모 여러분을 진심으로 환영합니다.",
        "우리는 종종 '영어가 인생의 전부는 아니다'라는 말을 듣습니다. 하지만 유창한 영어 구사력은 전 세계 수많은 사람들과 소통하고, 글로벌 기업에 도전하며, 더 넓은 세상의 기회를 내 것으로 만드는 가장 강력한 열쇠임은 분명합니다.",
        "SYA는 이름 그대로 당신만을 위한 가장 특별한 맞춤 교육(Special Your Academy)을 지향합니다. 학생 한 분 한 분의 성향과 레벨에 완벽히 맞춘 1:1 밀착형 교육을 통해 매일 아침 선생님과 눈을 맞추며 대화를 나누고, 매주 눈에 띄게 발전하는 자신을 발견하는 그 놀라운 순간들을 SYA의 모든 교직원이 함께할 것입니다.",
        "안전하고 쾌적한 캠퍼스 환경, 부모님의 마음으로 준비한 정갈한 식사, 철저한 생활 관리로 여러분의 소중한 시간과 비용이 가장 빛나는 미래로 돌아오도록 온 정성을 다하겠습니다.",
      ],
      closing: "감사합니다.",
    },
    faculty: {
      heading: "SYA의 자부심, 상위 3% 엄선된 정규 강사진",
      subtitle: "엄격한 5단계 채용 프로세스와 정기 TESOL 심화 워크숍을 통과한 베테랑 전담 튜터들이 학생의 눈높이에 맞춰 수업을 이끕니다.",
      cards: [
        { icon: "award", title: "전원 4년제 영문·교육학 학사", description: "필리핀 국립대(UP), 아테네오, 산토토마스 등 명문대 출신으로 표준 미국식 억양과 우수한 인성을 겸비한 튜터만을 선발합니다." },
        { icon: "shield", title: "학생 평가 기반 강사 책임제", description: "매 2주마다 재원생이 직접 참여하는 익명 티칭 만족도 평가를 통해 지속적인 강의력 품질 관리 및 학생-강사 매칭 최적화를 보장합니다." },
      ],
    },
    facility: {
      heading: "안전하고 쾌적한 프리미엄 캠퍼스 시설",
      subtitle: "학업과 휴식이 균형 잡힌 공간에서 몰입도 높은 하루를 보냅니다.",
      cards: [
        { title: "독립형 1:1 맨투맨 전용 큐비클", description: "방음 설계와 개인 책상, 화이트보드가 완비되어 강사와 100% 집중하여 대화할 수 있는 독립 수업 공간 80개실을 완비했습니다." },
        { title: "야외 리조트형 수영장 & 카페 라운지", description: "수업 후 스트레스를 풀 수 있는 깨끗한 야외 수영장과 시원한 음료를 즐기며 자유롭게 영어 대화를 나눌 수 있는 오픈 테라스입니다." },
        { title: "개인 지정석 24시간 프리미엄 독서실", description: "초고속 전용 와이파이, 인체공학 의자, 개별 전원 콘센트가 구비된 조용하고 몰입도 높은 자율 학습 공간입니다." },
      ],
    },
    location: {
      badge: "CAMPUS LOCATION",
      heading: "천혜의 휴양과 교육이 공존하는 필리핀 세부 캠퍼스",
      paragraph: "SYA 어학원이 위치한 세부(Cebu)는 필리핀 최고의 인프라와 안전한 치안, 세계적인 휴양 시설과 대형 쇼핑몰(아얄라몰, SM몰), 막탄 국제공항이 인접해 있는 최적의 어학연수 입지입니다.",
      infoCards: [
        { title: "세부 막탄 국제공항(CEB)에서 25분 거리", description: "인천·부산·대구 등 매일 다수의 직항편이 운항하며, 학원 전용 안심 픽업 차량으로 신속하고 안전하게 이동합니다." },
        { title: "안심 편의 인프라 도보 5분", description: "대형 한인 마트, 한국 프랜차이즈 식당, 세부 종합병원(Chong Hua Hospital) 등이 인접해 있습니다." },
      ],
      darkBox: {
        addressBadge: "공식 주소 및 연락처",
        campusName: "SYA Philippine Cebu Main Campus",
        campusAddressLabel: "필리핀 캠퍼스",
        officeAddressLabel: "필리핀 사무소",
        phoneKoreaLabel: "한국 상담처",
        phonePhLabel: "현지 직통",
        kakaoLabel: "카카오톡 채널",
        kakao: "SYA_ACADEMY",
      },
      ctaLabel: "방문 및 입학 상담 문의하기",
    },
  },
  en: {
    pageBadge: "About SYA",
    pageTitle: "About",
    pageSubtitle: "A premier Cebu language school built on official TESDA accreditation and vetted, expert instructors",
    sidebarTitles: {
      overview: "About SYA Academy",
      director: "Director's Message",
      faculty: "Faculty System",
      facility: "Campus & Facilities",
      location: "Location & Map",
    },
    overview: {
      badge: "FOUNDATION & VISION",
      heading: "Not Just English Training — A Turning Point in Your Life",
      paragraphs: [
        "SYA (Special Your Academy) is a premier language school operating a premium campus in Cebu, the Philippines' leading resort and education hub.",
        "To solve the two biggest barriers Korean students face in English conversation — lack of speaking opportunities and fear — SYA has built an immersive teaching method combining up to 4 hours of daily 1:1 classes with native-speaker coaching.",
      ],
      checklist: [
        { title: "Officially Accredited by the Philippine TESDA", description: "Official certification from the Technical Education and Skills Development Authority (TESDA) guarantees legal safety and curriculum credibility." },
        { title: "Officially Licensed SSP Issuing Institution", description: "The academy directly handles your Special Study Permit (SSP), so you can focus on studying without visa worries." },
        { title: "A Safe, Resort-Style Closed Campus", description: "24-hour security guards and CCTV, plus a resident Korean manager in the dormitory, provide total peace of mind." },
      ],
      imageBadge: "1:1 Premium Mentoring",
      imageCaption: "SYA's signature 1:1 care, fully focused on every single student",
    },
    director: {
      badge: "DIRECTOR'S MESSAGE",
      quote: "We will support your courageous challenge so it blossoms into a brilliant achievement.",
      name: "The Director and the entire faculty of SYA (Special Your Academy)",
      paragraphs: [
        "Hello, and a heartfelt welcome to every student and parent who has chosen SYA Language Academy.",
        "We often hear that “English isn't everything in life.” But fluent English is undeniably one of the most powerful keys to communicating with people around the world, pursuing opportunities at global companies, and claiming the opportunities of a wider world as your own.",
        "True to its name, SYA (Special Your Academy) is dedicated to the most special education tailored just for you. Through 1:1 instruction perfectly matched to each student's personality and level, every member of the SYA faculty will be by your side for the remarkable moments of meeting your teacher's eyes every morning and discovering your own visible progress week after week.",
        "With a safe and comfortable campus environment, wholesome meals prepared with a parent's care, and thorough attention to daily life, we will do everything in our power to make sure your precious time and investment return to you as your brightest future.",
      ],
      closing: "Thank you.",
    },
    faculty: {
      heading: "SYA's Pride — The Top 3% of Rigorously Selected Full-Time Faculty",
      subtitle: "Veteran, dedicated tutors who have passed a strict 5-stage hiring process and regular advanced TESOL workshops lead every class at the student's own pace.",
      cards: [
        { icon: "award", title: "100% Hold a 4-Year Degree in English or Education", description: "We select only tutors from top universities such as the University of the Philippines, Ateneo, and UST who combine a standard American accent with excellent character." },
        { icon: "shield", title: "Teacher Accountability Based on Student Evaluations", description: "An anonymous teaching satisfaction survey completed by enrolled students every two weeks ensures ongoing quality control and optimal student-teacher matching." },
      ],
    },
    facility: {
      heading: "Safe, Comfortable Premium Campus Facilities",
      subtitle: "Spend an immersive day in spaces that balance study and rest.",
      cards: [
        { title: "Private 1:1 Study Cubicles", description: "80 soundproofed private classrooms, each with its own desk and whiteboard, let you focus 100% on conversation with your teacher." },
        { title: "Outdoor Resort-Style Pool & Cafe Lounge", description: "A clean outdoor pool to unwind after class, plus an open terrace where you can enjoy a cool drink while chatting freely in English." },
        { title: "24-Hour Premium Self-Study Room with Assigned Seats", description: "A quiet, highly focused self-study space equipped with dedicated high-speed Wi-Fi, ergonomic chairs, and individual power outlets." },
      ],
    },
    location: {
      badge: "CAMPUS LOCATION",
      heading: "An SYA Cebu Campus Where Natural Beauty Meets World-Class Education",
      paragraph: "Cebu, home to SYA Academy, offers the Philippines' best infrastructure and public safety, plus proximity to world-class resort facilities, major malls (Ayala Mall, SM Mall), and Mactan International Airport — making it an ideal location for language study abroad.",
      infoCards: [
        { title: "25 Minutes from Mactan-Cebu International Airport (CEB)", description: "With multiple daily direct flights from Incheon, Busan, Daegu and more, our dedicated pickup vehicle gets you here quickly and safely." },
        { title: "5-Minute Walk to Everyday Convenience", description: "Large Korean supermarkets, Korean franchise restaurants, and Cebu's Chong Hua Hospital are all nearby." },
      ],
      darkBox: {
        addressBadge: "Official Address & Contact",
        campusName: "SYA Philippine Cebu Main Campus",
        campusAddressLabel: "Philippine Campus",
        officeAddressLabel: "Philippine Office",
        phoneKoreaLabel: "Korea Consultation Line",
        phonePhLabel: "Local Direct Line",
        kakaoLabel: "KakaoTalk Channel",
        kakao: "SYA_ACADEMY",
      },
      ctaLabel: "Contact Us for a Visit or Admission Consultation",
    },
  },
  ja: {
    pageBadge: "About SYA",
    pageTitle: "学院紹介",
    pageSubtitle: "正規TESDA認可と検証済みの講師陣が作るセブの名門語学学校",
    sidebarTitles: {
      overview: "SYA学院紹介",
      director: "院長挨拶",
      faculty: "専任講師陣システム",
      facility: "キャンパス施設・安全",
      location: "アクセス",
    },
    overview: {
      badge: "設立理念とビジョン",
      heading: "単なる語学研修ではなく、人生の転換点をつくる教育",
      paragraphs: [
        "SYA（Special Your Academy）は、フィリピンを代表するリゾート・教育都市セブに、プレミアムキャンパスを構える名門語学学校です。",
        "韓国人学生が英会話で直面する最大の壁である『発話機会の不足』と『恐怖心』を解決するため、1日最大4時間の1対1集中授業とネイティブスピーカーによるスピーチコーチングを組み合わせた没入型指導法を確立しました。",
      ],
      checklist: [
        { title: "フィリピン政府TESDA正式認可校", description: "フィリピン技術教育技能開発庁（TESDA）の正式認証を取得し、法的安全性とカリキュラムの信頼性を保証します。" },
        { title: "移民局正式SSP認定発給機関", description: "合法的な学生滞在許可証（SSP）を学校が直接代行発給するため、ビザの心配なく学業に専念できます。" },
        { title: "安全なリゾート型クローズドキャンパス", description: "24時間警備員とCCTVが常時稼働し、韓国人マネージャーが寮に常駐するトータルケア体制です。" },
      ],
      imageBadge: "1:1 Premium Mentoring",
      imageCaption: "一人ひとりの学生に100%集中するSYAならではの1対1ケア",
    },
    director: {
      badge: "院長挨拶",
      quote: "皆様の勇気ある挑戦が輝かしい実を結ぶよう、全力でサポートいたします。",
      name: "SYA（Special Your Academy）院長 & 教職員一同",
      paragraphs: [
        "こんにちは。SYA語学学校をお選びいただいた学生・保護者の皆様を心より歓迎いたします。",
        "『英語が人生のすべてではない』という言葉をよく耳にします。しかし、流暢な英語力が世界中の人々とコミュニケーションを取り、グローバル企業に挑戦し、より広い世界の機会を自分のものにする、最も強力な鍵であることは間違いありません。",
        "SYAはその名の通り、あなただけのための特別な教育（Special Your Academy）を目指します。学生一人ひとりの性格とレベルに完全に合わせた1対1の密着指導を通じて、毎朝先生と目を合わせて会話を交わし、毎週目に見えて成長する自分を発見する、その驚きの瞬間をSYAの全教職員が共にいたします。",
        "安全で快適なキャンパス環境、親の心で用意した丁寧な食事、徹底した生活管理を通じて、皆様の大切な時間と費用が最も輝かしい未来として返ってくるよう、誠心誠意努めてまいります。",
      ],
      closing: "ありがとうございます。",
    },
    faculty: {
      heading: "SYAの誇り、上位3%の厳選された専任講師陣",
      subtitle: "厳格な5段階採用プロセスと定期的なTESOL上級ワークショップを修了したベテラン専属チューターが、学生の目線に合わせて授業を進めます。",
      cards: [
        { icon: "award", title: "全員4年制英文学・教育学学士号取得", description: "フィリピン国立大学（UP）、アテネオ、サントトマスなど名門大学出身で、標準的なアメリカ英語アクセントと優れた人柄を兼ね備えたチューターのみを選抜しています。" },
        { icon: "shield", title: "学生評価に基づく講師責任制", description: "2週間ごとに在校生が参加する匿名ティーチング満足度評価により、継続的な指導品質管理と学生・講師の最適マッチングを保証します。" },
      ],
    },
    facility: {
      heading: "安全で快適なプレミアムキャンパス施設",
      subtitle: "学習と休息のバランスが取れた空間で、没入感の高い一日を過ごします。",
      cards: [
        { title: "独立型1対1マンツーマン専用キュービクル", description: "防音設計と個人机、ホワイトボードを完備し、講師と100%集中して会話できる独立授業スペース80室を完備しています。" },
        { title: "屋外リゾート型プール＆カフェラウンジ", description: "授業後のストレス発散に最適な清潔な屋外プールと、涼しい飲み物を楽しみながら自由に英会話ができるオープンテラスです。" },
        { title: "個人指定席24時間プレミアム自習室", description: "超高速専用Wi-Fi、人間工学チェア、個別電源コンセントを備えた、静かで没入度の高い自主学習スペースです。" },
      ],
    },
    location: {
      badge: "キャンパスロケーション",
      heading: "天恵のリゾートと教育が共存するフィリピン・セブキャンパス",
      paragraph: "SYA語学学校があるセブは、フィリピン最高のインフラと治安の良さ、世界的なリゾート施設や大型ショッピングモール（アヤラモール、SMモール）、マクタン国際空港が隣接する、語学留学に最適な立地です。",
      infoCards: [
        { title: "セブ・マクタン国際空港（CEB）から25分", description: "仁川・釜山・大邱など毎日多数の直行便が運航しており、学校専用の安心ピックアップ車両で迅速かつ安全に移動します。" },
        { title: "徒歩5分の安心利便インフラ", description: "大型韓国系スーパー、韓国フランチャイズレストラン、セブ総合病院（Chong Hua Hospital）などが隣接しています。" },
      ],
      darkBox: {
        addressBadge: "公式住所・連絡先",
        campusName: "SYA Philippine Cebu Main Campus",
        campusAddressLabel: "フィリピンキャンパス",
        officeAddressLabel: "フィリピン事務所",
        phoneKoreaLabel: "韓国相談窓口",
        phonePhLabel: "現地直通",
        kakaoLabel: "カカオトークチャンネル",
        kakao: "SYA_ACADEMY",
      },
      ctaLabel: "見学・入学相談のお問い合わせ",
    },
  },
  vi: {
    pageBadge: "About SYA",
    pageTitle: "Giới thiệu",
    pageSubtitle: "Trường Anh ngữ danh tiếng tại Cebu được xây dựng trên chứng nhận TESDA chính thức và đội ngũ giảng viên đã qua kiểm chứng",
    sidebarTitles: {
      overview: "Giới thiệu học viện SYA",
      director: "Lời chào từ Giám đốc",
      faculty: "Hệ thống giảng viên chuyên môn",
      facility: "Cơ sở vật chất & An ninh",
      location: "Đường đến trường",
    },
    overview: {
      badge: "NỀN TẢNG & TẦM NHÌN",
      heading: "Không chỉ là du học tiếng Anh, mà là bước ngoặt của cuộc đời",
      paragraphs: [
        "SYA (Special Your Academy) là học viện Anh ngữ danh tiếng với khuôn viên cao cấp tại Cebu, trung tâm nghỉ dưỡng và giáo dục hàng đầu của Philippines.",
        "Để giải quyết hai rào cản lớn nhất mà học viên Hàn Quốc gặp phải khi giao tiếp tiếng Anh — thiếu cơ hội nói và nỗi sợ hãi — SYA đã xây dựng phương pháp giảng dạy đắm chìm kết hợp tối đa 4 giờ học 1:1 mỗi ngày với huấn luyện phát âm từ giáo viên bản ngữ.",
      ],
      checklist: [
        { title: "Học viện được TESDA Philippines chính thức công nhận", description: "Chứng nhận chính thức từ Cục Phát triển Kỹ năng và Giáo dục Kỹ thuật (TESDA) đảm bảo tính an toàn pháp lý và uy tín của chương trình học." },
        { title: "Cơ quan được cấp phép cấp SSP chính thức", description: "Học viện trực tiếp thay mặt xin cấp Giấy phép Học tập Đặc biệt (SSP) hợp pháp, giúp bạn an tâm học tập mà không lo về visa." },
        { title: "Khuôn viên khép kín an toàn kiểu resort", description: "Bảo vệ và camera an ninh hoạt động 24/24, cùng quản lý người Hàn thường trú tại ký túc xá, mang đến hệ thống chăm sóc toàn diện." },
      ],
      imageBadge: "1:1 Premium Mentoring",
      imageCaption: "Sự chăm sóc 1:1 đặc trưng của SYA, tập trung hoàn toàn vào từng học viên",
    },
    director: {
      badge: "LỜI CHÀO TỪ GIÁM ĐỐC",
      quote: "Chúng tôi sẽ đồng hành để sự dũng cảm dấn thân của các bạn đơm hoa kết trái rực rỡ.",
      name: "Giám đốc SYA (Special Your Academy) & toàn thể đội ngũ",
      paragraphs: [
        "Xin chào, chúng tôi xin chân thành chào đón tất cả học viên và phụ huynh đã lựa chọn học viện SYA.",
        "Chúng ta thường nghe câu 'tiếng Anh không phải là tất cả cuộc sống'. Nhưng khả năng tiếng Anh lưu loát chắc chắn là chìa khóa mạnh mẽ nhất để giao tiếp với mọi người trên toàn thế giới, chinh phục các công ty toàn cầu và nắm bắt cơ hội của một thế giới rộng lớn hơn.",
        "Đúng như tên gọi, SYA (Special Your Academy) hướng đến nền giáo dục đặc biệt nhất dành riêng cho bạn. Thông qua giảng dạy 1:1 hoàn toàn phù hợp với tính cách và trình độ của từng học viên, toàn thể đội ngũ SYA sẽ đồng hành cùng bạn trong những khoảnh khắc kỳ diệu khi trò chuyện cùng giáo viên mỗi sáng và nhận ra sự tiến bộ rõ rệt của bản thân mỗi tuần.",
        "Với môi trường khuôn viên an toàn, thoải mái, những bữa ăn tinh tế được chuẩn bị bằng tấm lòng của người cha mẹ, và sự quản lý sinh hoạt chặt chẽ, chúng tôi sẽ tận tâm hết mình để thời gian và chi phí quý báu của các bạn trở thành tương lai rạng rỡ nhất.",
      ],
      closing: "Xin cảm ơn.",
    },
    faculty: {
      heading: "Niềm tự hào của SYA — Đội ngũ giảng viên cơ hữu top 3% được tuyển chọn kỹ lưỡng",
      subtitle: "Các gia sư chuyên trách giàu kinh nghiệm đã vượt qua quy trình tuyển dụng nghiêm ngặt 5 bước và các hội thảo TESOL nâng cao định kỳ, dẫn dắt lớp học theo đúng trình độ của học viên.",
      cards: [
        { icon: "award", title: "100% tốt nghiệp đại học 4 năm ngành Anh văn/Giáo dục", description: "Chỉ tuyển chọn gia sư từ các trường đại học danh tiếng như Đại học Philippines (UP), Ateneo, Santo Tomas, sở hữu giọng chuẩn Mỹ và nhân cách xuất sắc." },
        { icon: "shield", title: "Chế độ trách nhiệm giảng viên dựa trên đánh giá học viên", description: "Khảo sát mức độ hài lòng giảng dạy ẩn danh do học viên thực hiện mỗi 2 tuần đảm bảo quản lý chất lượng giảng dạy liên tục và ghép cặp học viên-giảng viên tối ưu." },
      ],
    },
    facility: {
      heading: "Cơ sở vật chất khuôn viên cao cấp an toàn, thoải mái",
      subtitle: "Trải qua một ngày đắm chìm trong không gian cân bằng giữa học tập và nghỉ ngơi.",
      cards: [
        { title: "Phòng học 1:1 riêng biệt kiểu cabin", description: "80 phòng học cách âm riêng biệt, mỗi phòng có bàn học riêng và bảng trắng, giúp bạn tập trung 100% trò chuyện cùng giáo viên." },
        { title: "Hồ bơi ngoài trời kiểu resort & Cafe Lounge", description: "Hồ bơi ngoài trời sạch sẽ để giải tỏa căng thẳng sau giờ học, cùng sân thượng mở để thưởng thức đồ uống mát lạnh và tự do trò chuyện tiếng Anh." },
        { title: "Phòng tự học cao cấp 24/24 với chỗ ngồi riêng", description: "Không gian tự học yên tĩnh, tập trung cao độ với Wi-Fi tốc độ cao riêng, ghế công thái học và ổ cắm điện riêng cho từng người." },
      ],
    },
    location: {
      badge: "VỊ TRÍ KHUÔN VIÊN",
      heading: "Khuôn viên SYA Cebu nơi nghỉ dưỡng thiên nhiên và giáo dục cùng tồn tại",
      paragraph: "Cebu, nơi đặt trụ sở học viện SYA, sở hữu cơ sở hạ tầng tốt nhất Philippines, an ninh an toàn, các cơ sở nghỉ dưỡng đẳng cấp thế giới cùng các trung tâm thương mại lớn (Ayala Mall, SM Mall) và sân bay quốc tế Mactan liền kề — vị trí lý tưởng cho du học tiếng Anh.",
      infoCards: [
        { title: "Cách sân bay quốc tế Mactan-Cebu (CEB) 25 phút", description: "Với nhiều chuyến bay thẳng hàng ngày từ Incheon, Busan, Daegu, xe đón riêng của học viện sẽ đưa bạn di chuyển nhanh chóng và an toàn." },
        { title: "5 phút đi bộ đến các tiện ích an tâm", description: "Siêu thị Hàn Quốc lớn, nhà hàng chuỗi Hàn Quốc, bệnh viện đa khoa Cebu (Chong Hua Hospital) đều nằm gần đó." },
      ],
      darkBox: {
        addressBadge: "Địa chỉ và liên hệ chính thức",
        campusName: "SYA Philippine Cebu Main Campus",
        campusAddressLabel: "Cơ sở tại Philippines",
        officeAddressLabel: "Văn phòng tại Philippines",
        phoneKoreaLabel: "Đường dây tư vấn Hàn Quốc",
        phonePhLabel: "Đường dây trực tiếp tại địa phương",
        kakaoLabel: "Kênh KakaoTalk",
        kakao: "SYA_ACADEMY",
      },
      ctaLabel: "Liên hệ tư vấn tham quan & nhập học",
    },
  },
  "zh-TW": {
    pageBadge: "About SYA",
    pageTitle: "學院介紹",
    pageSubtitle: "由官方TESDA認證與嚴選師資打造的宿霧知名語言學校",
    sidebarTitles: {
      overview: "SYA學院介紹",
      director: "院長致詞",
      faculty: "專任師資系統",
      facility: "校園設施與安全",
      location: "交通指南",
    },
    overview: {
      badge: "辦學理念與願景",
      heading: "不只是語言研修，而是人生的轉捩點",
      paragraphs: [
        "SYA（Special Your Academy）是一所位於菲律賓頂級渡假與教育中心宿霧（Cebu）、擁有頂級校園的知名語言學校。",
        "為解決韓國學生在英語會話中面臨的兩大障礙——「開口機會不足」與「恐懼感」，SYA建立了結合每日最長4小時一對一密集課程與母語人士口說指導的沉浸式教學法。",
      ],
      checklist: [
        { title: "菲律賓政府TESDA正式認可教育機構", description: "取得菲律賓技術教育技能發展局（TESDA）正式認證，保障法律安全性與課程公信力。" },
        { title: "移民局正式SSP認證發給機構", description: "由學校直接代辦合法學生停留許可證（SSP），讓您無需擔心簽證問題，專心學習。" },
        { title: "安全的渡假村式封閉校園", description: "24小時保全人員與監視器全天候運作，並有韓籍經理常駐宿舍，提供全方位照護系統。" },
      ],
      imageBadge: "1:1 Premium Mentoring",
      imageCaption: "SYA獨有的1對1密集照護，完全專注於每一位學生",
    },
    director: {
      badge: "院長致詞",
      quote: "我們將全力支持您勇敢的挑戰，使其結出燦爛的果實。",
      name: "SYA（Special Your Academy）院長 及全體教職員",
      paragraphs: [
        "您好，誠摯歡迎每一位選擇SYA語言學院的學生與家長。",
        "我們常聽到「英語不是人生的全部」這句話。但流利的英語能力無疑是與全世界溝通、挑戰跨國企業、掌握更廣闊世界機會的最強大鑰匙。",
        "正如其名，SYA（Special Your Academy）致力於為您打造最特別的專屬教育。透過完全貼合每位學生個性與程度的一對一密集指導，SYA全體教職員將與您一同見證每天早晨與老師對視交談、每週肉眼可見的進步這些驚喜時刻。",
        "我們將以安全舒適的校園環境、以父母之心準備的精緻餐食，以及徹底的生活管理，全心全意讓您寶貴的時間與投資，化作最耀眼的未來。",
      ],
      closing: "謝謝大家。",
    },
    faculty: {
      heading: "SYA的驕傲——嚴選前3%專任師資",
      subtitle: "通過嚴格五階段招聘流程與定期TESOL進階研習的資深專屬導師，配合學生程度引導課程。",
      cards: [
        { icon: "award", title: "全員擁有4年制英文/教育學學士學位", description: "僅選拔畢業於菲律賓大學（UP）、雅典耀大學、聖多瑪斯大學等名校，兼具標準美式口音與優良人品的導師。" },
        { icon: "shield", title: "基於學生評價的教師責任制", description: "每兩週由在校學生參與的匿名教學滿意度評鑑，確保持續的教學品質管理與師生最佳配對。" },
      ],
    },
    facility: {
      heading: "安全舒適的頂級校園設施",
      subtitle: "在學習與休息平衡的空間中，度過沉浸感十足的一天。",
      cards: [
        { title: "獨立式一對一專屬小隔間", description: "配備隔音設計、個人書桌與白板的80間獨立教室，讓您能與老師100%專注對話。" },
        { title: "戶外渡假村風格泳池與咖啡廳", description: "課後放鬆身心的乾淨戶外泳池，以及可自由暢飲、輕鬆用英語交談的開放式露台。" },
        { title: "24小時個人專屬自習座位", description: "配備高速專用Wi-Fi、人體工學座椅與獨立插座，安靜且高度專注的自主學習空間。" },
      ],
    },
    location: {
      badge: "校園位置",
      heading: "渡假天堂與教育並存的菲律賓宿霧校園",
      paragraph: "SYA語言學院所在的宿霧（Cebu），擁有菲律賓最佳的基礎建設與治安、世界級渡假設施，並鄰近大型購物中心（Ayala Mall、SM Mall）與麥克坦國際機場，是語言遊學的絕佳地點。",
      infoCards: [
        { title: "距宿霧麥克坦國際機場（CEB）僅25分鐘", description: "每日有多班從仁川、釜山、大邱等地直飛的航班，並由學校專屬接送車輛快速安全地接送。" },
        { title: "步行5分鐘可達安心便利設施", description: "鄰近大型韓國超市、韓式連鎖餐廳、宿霧綜合醫院（Chong Hua Hospital）等設施。" },
      ],
      darkBox: {
        addressBadge: "正式地址與聯絡方式",
        campusName: "SYA Philippine Cebu Main Campus",
        campusAddressLabel: "菲律賓校區",
        officeAddressLabel: "菲律賓辦公室",
        phoneKoreaLabel: "韓國諮詢處",
        phonePhLabel: "當地直撥電話",
        kakaoLabel: "LINE官方帳號",
        kakao: "SYA_ACADEMY",
      },
      ctaLabel: "預約參觀與入學諮詢",
    },
  },
  mn: {
    pageBadge: "About SYA",
    pageTitle: "Бидний тухай",
    pageSubtitle: "Албан ёсны TESDA магадлан итгэмжлэл болон шалгарсан багш нарын багаар бүрдсэн Себүгийн тэргүүлэх хэлний сургууль",
    sidebarTitles: {
      overview: "SYA сургуулийн танилцуулга",
      director: "Захирлын мэндчилгээ",
      faculty: "Мэргэжлийн багш нарын систем",
      facility: "Кампусын байгууламж ба аюулгүй байдал",
      location: "Хэрхэн очих",
    },
    overview: {
      badge: "ҮНДЭС БА АЛСЫН ХАРАА",
      heading: "Зөвхөн хэлний сургалт биш, амьдралын эргэлтийн цэг болох боловсрол",
      paragraphs: [
        "SYA (Special Your Academy) нь Филиппиний тэргүүлэх амралт, боловсролын төв Себү хотод байрлах тансаг кампустай нэр хүндтэй хэлний сургууль юм.",
        "Солонгос сурагчдын англи ярианд тулгардаг хамгийн том хоёр бэрхшээл болох 'ярих боломж дутагдах' болон 'айдас'-ыг шийдвэрлэхийн тулд, өдөрт хамгийн ихдээ 4 цагийн 1:1 хичээл болон төрөлх хэлтэн багшийн ярианы дасгалжуулалтыг хослуулсан нэвтрэлт заах аргачлалыг бий болгосон.",
      ],
      checklist: [
        { title: "Филиппины засгийн газрын TESDA-ийн албан ёсны магадлан итгэмжлэгдсэн сургууль", description: "Филиппины Техник Боловсрол, Ур Чадвар Хөгжлийн Газрын (TESDA) албан ёсны гэрчилгээ нь хууль эрх зүйн аюулгүй байдал болон хөтөлбөрийн нэр хүндийг баталгаажуулдаг." },
        { title: "Цагаачлалын албаны албан ёсны SSP олгох эрх бүхий байгууллага", description: "Хууль ёсны оюутны оршин суух зөвшөөрлийг (SSP) сургууль шууд төлөөлөн авч өгдөг тул та визийн санаа зоволгүйгээр суралцахад анхаарлаа хандуулж чадна." },
        { title: "Аюулгүй амралтын газрын маягийн хаалттай кампус", description: "24 цагийн харуул хамгаалалт, CCTV байнга ажилладаг ба дотуур байранд Солонгос менежер байнга оршдог тул иж бүрэн халамжийн систем юм." },
      ],
      imageBadge: "1:1 Premium Mentoring",
      imageCaption: "Сурагч бүрт бүрэн анхаарал хандуулдаг SYA-гийн өвөрмөц 1:1 халамж",
    },
    director: {
      badge: "ЗАХИРЛЫН МЭНДЧИЛГЭЭ",
      quote: "Таны эр зоригтой сорилт гайхамшигтай үр дүнд хүрэхэд бид дэмжлэг үзүүлэх болно.",
      name: "SYA (Special Your Academy)-ийн захирал ба бүх багш нар",
      paragraphs: [
        "Сайн байна уу, SYA хэлний сургуулийг сонгосон бүх сурагч, эцэг эхчүүдийг чин сэтгэлээсээ угтан авч байна.",
        "Бид 'англи хэл бол амьдралын бүх зүйл биш' гэсэн үгийг байнга сонсдог. Гэвч чөлөөтэй англи хэл ярих чадвар нь дэлхийн олон хүмүүстэй харилцах, олон улсын компанид сорилт хийх, илүү өргөн ертөнцийн боломжийг өөрийн болгох хамгийн хүчирхэг түлхүүр гэдэгт эргэлзэхгүй.",
        "SYA нь нэрнийхээ дагуу зөвхөн танд зориулсан онцгой боловсролыг (Special Your Academy) эрмэлздэг. Сурагч бүрийн зан чанар, түвшинд бүрэн тохирсон 1:1 нягт хичээллэлээр өглөө бүр багштайгаа нүд харан ярилцаж, долоо хоног бүр анзаарагдам хөгжиж буй өөрийгөө олж мэдэх энэ гайхамшигт мөчүүдийг SYA-ийн бүх багш нар хамт туулна.",
        "Аюулгүй, тав тухтай кампусын орчин, эцэг эхийн сэтгэлээр бэлтгэсэн эрүүл хоол, нарийн зохион байгуулалттай амьдралын менежментээр таны үнэтэй цаг хугацаа, зардал хамгийн гэрэлтсэн ирээдүй болон эргэж ирэхийн төлөө бүх хүчээ дайчлах болно.",
      ],
      closing: "Баярлалаа.",
    },
    faculty: {
      heading: "SYA-ийн бахархал, шилдэг 3%-д багтсан бүрэн цагийн багш нар",
      subtitle: "Хатуу 5 үе шаттай ажилд авах процесс болон тогтмол TESOL дэвшилтэт семинарыг давсан туршлагатай багш нар сурагчийн түвшинд тохируулан хичээл заана.",
      cards: [
        { icon: "award", title: "Бүгд 4 жилийн Англи хэл/Боловсролын бакалаврын зэрэгтэй", description: "Филиппины Их Сургууль (UP), Ateneo, Санто Томас зэрэг нэр хүндтэй их сургуулиудыг төгссөн, стандарт Америк аялгуу болон онц зан чанартай багш нарыг л сонгон шалгаруулдаг." },
        { icon: "shield", title: "Сурагчийн үнэлгээнд суурилсан багшийн хариуцлагын систем", description: "2 долоо хоног тутам суралцагчид өөрсдөө оролцдог нэрээ нууцалсан заах чанарын сэтгэл ханамжийн судалгаагаар тасралтгүй заах чанарын хяналт, сурагч-багшийн тохироог хангадаг." },
      ],
    },
    facility: {
      heading: "Аюулгүй, тав тухтай тансаг кампусын байгууламж",
      subtitle: "Суралцах, амрах тэнцвэртэй орчинд нэвтрэлт өндөртэй өдрийг өнгөрөөнө.",
      cards: [
        { title: "Тусдаа 1:1 хичээлийн бяцхан өрөө", description: "Дуу тусгаарлагч тохиргоо, хувийн ширээ, цагаан самбартай тоноглогдсон 80 тусдаа өрөө нь багштайгаа 100% төвлөрч ярилцах боломжийг олгодог." },
        { title: "Гадна амралтын газрын маягийн усан сан & кафе", description: "Хичээлийн дараа стрессээ тайлах цэвэр гадна усан сан, сэрүүн ундаа ууж чөлөөтэй англиар ярилцах нээлттэй тераст." },
        { title: "Хувийн суудалтай 24 цагийн тансаг өөрөө суралцах өрөө", description: "Өндөр хурдны интернэт, эргономик сандал, тусдаа цахилгааны залгууртай тайван, өндөр нэвтрэлттэй бие даан суралцах орчин." },
      ],
    },
    location: {
      badge: "КАМПУСЫН БАЙРШИЛ",
      heading: "Байгалийн амралт ба боловсрол хамт оршдог Филиппины Себү кампус",
      paragraph: "SYA хэлний сургууль байрладаг Себү нь Филиппиний хамгийн сайн дэд бүтэц, аюулгүй байдал, дэлхийн түвшний амралтын байгууламж, том худалдааны төвүүд (Ayala Mall, SM Mall) болон Мактан олон улсын нисэх онгоцны буудалтай ойрхон байрладаг тул хэл сурах хамгийн тохиромжтой байршил юм.",
      infoCards: [
        { title: "Себү-Мактан олон улсын нисэх буудлаас (CEB) 25 минут", description: "Инчон, Бусан, Тэгү зэрэг газраас өдөр бүр олон шууд нислэгтэй бөгөөд сургуулийн тусгай угтах машин таныг хурдан бөгөөд аюулгүй хүргэнэ." },
        { title: "5 минутын алхаанд аюулгүй тохь тухтай дэд бүтэц", description: "Том Солонгос дэлгүүр, Солонгос сүлжээ ресторан, Себүгийн нэгдсэн эмнэлэг (Chong Hua Hospital) зэрэг ойрхон байрладаг." },
      ],
      darkBox: {
        addressBadge: "Албан ёсны хаяг ба холбоо барих",
        campusName: "SYA Philippine Cebu Main Campus",
        campusAddressLabel: "Филиппин дахь кампус",
        officeAddressLabel: "Филиппин дахь оффис",
        phoneKoreaLabel: "Солонгос дахь зөвлөгөөний утас",
        phonePhLabel: "Дотоод шууд утас",
        kakaoLabel: "KakaoTalk суваг",
        kakao: "SYA_ACADEMY",
      },
      ctaLabel: "Үзлэг болон элсэлтийн зөвлөгөө авах",
    },
  },
  ru: {
    pageBadge: "About SYA",
    pageTitle: "О нас",
    pageSubtitle: "Ведущая языковая школа Себу, построенная на официальной аккредитации TESDA и проверенных преподавателях",
    sidebarTitles: {
      overview: "О школе SYA",
      director: "Обращение директора",
      faculty: "Система преподавателей",
      facility: "Инфраструктура и безопасность",
      location: "Как добраться",
    },
    overview: {
      badge: "ОСНОВА И ВИДЕНИЕ",
      heading: "Не просто языковая стажировка, а поворотный момент в жизни",
      paragraphs: [
        "SYA (Special Your Academy) — ведущая языковая школа с премиальным кампусом в Себу, главном курортном и образовательном центре Филиппин.",
        "Чтобы решить две главные проблемы, с которыми сталкиваются корейские студенты в разговорном английском — нехватку возможностей говорить и страх — SYA создала систему погружённого обучения, сочетающую до 4 часов индивидуальных занятий 1:1 в день с коучингом произношения от носителей языка.",
      ],
      checklist: [
        { title: "Официально аккредитована TESDA Филиппин", description: "Официальная сертификация Управления технического образования и развития навыков (TESDA) гарантирует юридическую безопасность и авторитетность программы." },
        { title: "Официально лицензированное учреждение по выдаче SSP", description: "Школа напрямую оформляет легальное разрешение на пребывание студента (SSP), избавляя вас от забот о визе." },
        { title: "Безопасный закрытый кампус курортного типа", description: "Круглосуточная охрана и видеонаблюдение, а также проживающий в общежитии корейский менеджер обеспечивают полную заботу." },
      ],
      imageBadge: "1:1 Premium Mentoring",
      imageCaption: "Фирменная забота SYA 1:1, полностью сосредоточенная на каждом студенте",
    },
    director: {
      badge: "ОБРАЩЕНИЕ ДИРЕКТОРА",
      quote: "Мы поддержим ваш смелый шаг, чтобы он принёс блестящие плоды.",
      name: "Директор SYA (Special Your Academy) и весь преподавательский состав",
      paragraphs: [
        "Здравствуйте! От всего сердца приветствуем всех студентов и родителей, выбравших языковую школу SYA.",
        "Мы часто слышим фразу «английский — это не всё в жизни». Но свободное владение английским, несомненно, — один из самых мощных ключей к общению с людьми по всему миру, покорению глобальных компаний и обретению возможностей большого мира.",
        "Как и следует из названия, SYA (Special Your Academy) стремится дать вам самое особенное образование. Благодаря индивидуальному обучению 1:1, полностью адаптированному под характер и уровень каждого студента, весь коллектив SYA будет рядом с вами в те удивительные моменты, когда вы каждое утро смотрите в глаза учителю и еженедельно замечаете собственный заметный прогресс.",
        "Благодаря безопасной и комфортной кампусной среде, домашней заботливо приготовленной еде и тщательному контролю быта мы приложим все усилия, чтобы ваше драгоценное время и вложения обернулись самым светлым будущим.",
      ],
      closing: "Благодарим вас.",
    },
    faculty: {
      heading: "Гордость SYA — топ-3% тщательно отобранных штатных преподавателей",
      subtitle: "Опытные преподаватели, прошедшие строгий 5-этапный отбор и регулярные продвинутые семинары TESOL, ведут занятия с учётом уровня каждого студента.",
      cards: [
        { icon: "award", title: "100% имеют 4-летнее образование по английскому языку или педагогике", description: "Мы отбираем только преподавателей из ведущих университетов, таких как Филиппинский университет (UP), Ateneo и Santo Tomas, обладающих стандартным американским акцентом и отличными личными качествами." },
        { icon: "shield", title: "Ответственность преподавателей на основе оценок студентов", description: "Анонимный опрос удовлетворённости преподаванием, проводимый студентами каждые две недели, обеспечивает постоянный контроль качества и оптимальный подбор пары студент-преподаватель." },
      ],
    },
    facility: {
      heading: "Безопасная и комфортная премиальная инфраструктура кампуса",
      subtitle: "Проведите насыщенный день в пространстве, где учёба уравновешена отдыхом.",
      cards: [
        { title: "Отдельные кабинки для индивидуальных занятий 1:1", description: "80 звукоизолированных аудиторий с собственным столом и доской позволяют на 100% сосредоточиться на разговоре с преподавателем." },
        { title: "Открытый бассейн курортного типа и кафе-лаунж", description: "Чистый открытый бассейн для снятия стресса после занятий и открытая терраса, где можно свободно общаться на английском за прохладным напитком." },
        { title: "Премиальная зона для самостоятельной учёбы, работает круглосуточно", description: "Тихое, располагающее к концентрации пространство с выделенным высокоскоростным Wi-Fi, эргономичными креслами и индивидуальными розетками." },
      ],
    },
    location: {
      badge: "РАСПОЛОЖЕНИЕ КАМПУСА",
      heading: "Кампус SYA в Себу, где курортная природа сочетается с образованием",
      paragraph: "Себу, где расположена академия SYA, обладает лучшей инфраструктурой и безопасностью на Филиппинах, а также близостью к курортам мирового класса, крупным торговым центрам (Ayala Mall, SM Mall) и международному аэропорту Мактан — идеальное место для языковой стажировки.",
      infoCards: [
        { title: "25 минут от международного аэропорта Мактан-Себу (CEB)", description: "Благодаря множеству ежедневных прямых рейсов из Инчхона, Пусана, Тэгу и других городов, наш собственный трансфер быстро и безопасно доставит вас на место." },
        { title: "5 минут пешком до всей необходимой инфраструктуры", description: "Рядом расположены крупные корейские супермаркеты, корейские сетевые рестораны и многопрофильная больница Себу (Chong Hua Hospital)." },
      ],
      darkBox: {
        addressBadge: "Официальный адрес и контакты",
        campusName: "SYA Philippine Cebu Main Campus",
        campusAddressLabel: "Кампус на Филиппинах",
        officeAddressLabel: "Офис на Филиппинах",
        phoneKoreaLabel: "Линия консультаций в Корее",
        phonePhLabel: "Прямая линия на месте",
        kakaoLabel: "Канал KakaoTalk",
        kakao: "SYA_ACADEMY",
      },
      ctaLabel: "Связаться для визита или консультации по поступлению",
    },
  },
  ar: {
    pageBadge: "About SYA",
    pageTitle: "عن الأكاديمية",
    pageSubtitle: "أكاديمية لغات مرموقة في سيبو تقوم على الاعتماد الرسمي من \u2066TESDA\u2069 ومعلّمين خبراء تم التحقق من كفاءتهم",
    sidebarTitles: {
      overview: "نبذة عن أكاديمية \u2066SYA\u2069",
      director: "كلمة المدير",
      faculty: "نظام الكادر التعليمي",
      facility: "مرافق الحرم والسلامة",
      location: "الموقع والخريطة",
    },
    overview: {
      badge: "\u2066FOUNDATION & VISION\u2069",
      heading: "ليست مجرد دورة لغة، بل تعليم يصنع نقطة تحوّل في حياتك",
      paragraphs: [
        "أكاديمية \u2066SYA (Special Your Academy)\u2069 مدرسة لغات مرموقة تدير حرمًا متميزًا في سيبو \u2066(Cebu)\u2069، المركز الرائد للسياحة والتعليم في الفلبين.",
        "لتجاوز أكبر عائقين يواجههما الطلاب الكوريون في المحادثة الإنجليزية — قلة فرص التحدث والخوف — طوّرت \u2066SYA\u2069 أسلوب تدريس غامرًا يجمع بين دروس 1:1 مكثفة تصل إلى 4 ساعات يوميًا والتدريب على الخطابة مع متحدثين أصليين.",
      ],
      checklist: [
        { title: "أكاديمية معتمدة رسميًا من هيئة \u2066TESDA\u2069 الحكومية الفلبينية", description: "حصلنا على الاعتماد الرسمي من هيئة التعليم التقني وتنمية المهارات \u2066(TESDA)\u2069، ما يضمن السلامة القانونية وموثوقية المنهج." },
        { title: "جهة مرخّصة رسميًا لإصدار تصريح \u2066SSP\u2069 من مكتب الهجرة", description: "تتولى الأكاديمية مباشرةً إصدار تصريح الإقامة الدراسية القانوني \u2066(SSP)\u2069 نيابةً عنك، لتتفرغ للدراسة دون القلق بشأن التأشيرة." },
        { title: "حرم مغلق وآمن بطابع المنتجعات", description: "نظام رعاية متكامل يشمل حراس أمن وكاميرات مراقبة تعمل على مدار 24 ساعة، ومديرًا كوريًا مقيمًا في السكن." },
      ],
      imageBadge: "\u20661:1 Premium Mentoring\u2069",
      imageCaption: "رعاية \u2066SYA\u2069 المميزة بنظام 1:1 التي تركّز كليًا على كل طالب",
    },
    director: {
      badge: "\u2066DIRECTOR'S MESSAGE\u2069",
      quote: "سندعم تحدّيك الشجاع ليُثمر نجاحًا باهرًا.",
      name: "مدير أكاديمية \u2066SYA (Special Your Academy)\u2069 وجميع أعضاء الهيئة التعليمية والإدارية",
      paragraphs: [
        "مرحبًا، ونرحّب ترحيبًا صادقًا بجميع الطلاب وأولياء الأمور الذين اختاروا أكاديمية \u2066SYA\u2069 للغات.",
        "كثيرًا ما نسمع أن «الإنجليزية ليست كل شيء في الحياة». لكن إتقان الإنجليزية بطلاقة هو بلا شك من أقوى المفاتيح للتواصل مع الناس حول العالم، والسعي إلى الفرص في الشركات العالمية، واغتنام فرص عالم أوسع.",
        "كما يدل اسمها، تسعى \u2066SYA (Special Your Academy)\u2069 إلى تقديم أكثر تعليم مميز مصمم لك وحدك. ومن خلال تعليم 1:1 يتوافق تمامًا مع شخصية كل طالب ومستواه، سيكون جميع أعضاء الهيئة التعليمية في \u2066SYA\u2069 إلى جانبك في تلك اللحظات الرائعة، حين تتحدث مع معلمك وجهًا لوجه كل صباح، وتكتشف تقدّمك الواضح أسبوعًا بعد أسبوع.",
        "ومن خلال بيئة حرم آمنة ومريحة، ووجبات نظيفة أُعدّت بقلب الوالدين، وإدارة دقيقة للحياة اليومية، سنبذل قصارى جهدنا ليعود إليك وقتك الثمين واستثمارك في صورة أكثر مستقبل إشراقًا.",
      ],
      closing: "شكرًا لكم.",
    },
    faculty: {
      heading: "فخر \u2066SYA\u2069: نخبة الـ3% الأعلى من المعلمين المتفرغين المختارين بعناية",
      subtitle: "يقود الدروس معلمون متفرغون ذوو خبرة اجتازوا عملية توظيف صارمة من 5 مراحل وورش عمل \u2066TESOL\u2069 متقدمة ودورية، بما يتناسب مع مستوى كل طالب.",
      cards: [
        { icon: "award", title: "جميعهم حاصلون على بكالوريوس من 4 سنوات في الأدب الإنجليزي أو التربية", description: "نختار فقط معلمين من جامعات مرموقة مثل جامعة الفلبين \u2066(UP)\u2069 وأتينيو وسانتو توماس، يجمعون بين اللكنة الأمريكية القياسية والأخلاق الرفيعة." },
        { icon: "shield", title: "مساءلة المعلمين بناءً على تقييم الطلاب", description: "يضمن استطلاع رضا مجهول عن التدريس يشارك فيه الطلاب الملتحقون كل أسبوعين رقابة مستمرة على جودة التدريس وأفضل مواءمة بين الطالب والمعلم." },
      ],
    },
    facility: {
      heading: "مرافق حرم متميزة وآمنة ومريحة",
      subtitle: "اقضِ يومًا مليئًا بالتركيز في مساحات توازن بين الدراسة والراحة.",
      cards: [
        { title: "مقصورات خاصة مستقلة لدروس 1:1", description: "80 قاعة دراسية مستقلة معزولة الصوت، مجهزة بمكتب خاص وسبورة بيضاء، لتتمكن من التركيز بنسبة 100% على المحادثة مع معلمك." },
        { title: "مسبح خارجي بطابع المنتجعات وصالة مقهى", description: "مسبح خارجي نظيف للاسترخاء بعد الدروس، وتراس مفتوح تستمتع فيه بمشروب بارد وتتحدث بالإنجليزية بحرية." },
        { title: "قاعة دراسة ذاتية متميزة على مدار 24 ساعة بمقاعد مخصصة", description: "مساحة هادئة للدراسة الذاتية بتركيز عالٍ، مجهزة بشبكة \u2066Wi-Fi\u2069 فائقة السرعة ومخصصة، وكراسٍ مريحة، ومقابس كهرباء فردية." },
      ],
    },
    location: {
      badge: "CAMPUS LOCATION",
      heading: "حرم \u2066SYA\u2069 في سيبو بالفلبين، حيث تلتقي الطبيعة الخلابة بالتعليم",
      paragraph: "تتميز سيبو \u2066(Cebu)\u2069، حيث تقع أكاديمية \u2066SYA\u2069، بأفضل بنية تحتية في الفلبين وأمن عام جيد، وقربها من المنتجعات العالمية والمراكز التجارية الكبرى \u2066(Ayala Mall, SM Mall)\u2069 ومطار ماكتان الدولي، ما يجعلها موقعًا مثاليًا لدراسة اللغة في الخارج.",
      infoCards: [
        { title: "على بُعد 25 دقيقة من مطار ماكتان-سيبو الدولي \u2066(CEB)\u2069", description: "تتوفر رحلات مباشرة يومية عديدة من إنتشون وبوسان ودايغو وغيرها، وتنقلك مركبة الاستقبال الخاصة بالأكاديمية بسرعة وأمان." },
        { title: "5 دقائق سيرًا إلى خدمات الحياة اليومية", description: "تقع بالقرب منا متاجر كورية كبيرة ومطاعم كورية ومستشفى سيبو العام \u2066(Chong Hua Hospital)\u2069." },
      ],
      darkBox: {
        addressBadge: "العنوان الرسمي ووسائل التواصل",
        campusName: "SYA Philippine Cebu Main Campus",
        campusAddressLabel: "حرم الفلبين",
        officeAddressLabel: "مكتب الفلبين",
        phoneKoreaLabel: "خط الاستشارات في كوريا",
        phonePhLabel: "الخط المباشر في الفلبين",
        kakaoLabel: "قناة \u2066KakaoTalk\u2069",
        kakao: "\u2066SYA_ACADEMY\u2069",
      },
      ctaLabel: "تواصل معنا للزيارة أو لاستشارة القبول",
    },
  },
};

export default function AboutContent({ lang }: AboutContentProps) {
  const t = translations[lang];
  const searchParams = useSearchParams();
  const { openConsultation } = useConsultationModal();
  const contact = useSiteContact();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // 헤더 드롭다운 등에서 ?tab=director 같은 쿼리로 들어오면 해당 탭을 바로 열어준다.
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && TAB_META.some((meta) => meta.id === tabParam)) {
      setActiveTab(tabParam as TabId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("tab")]);

  return (
    <main className="bg-sya-soft">
      {/* 상단 배너 */}
      <section className="bg-gradient-to-br from-sya-navy via-sya-navy to-sya-navy px-5 py-7 sm:px-8 sm:py-9">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sya-gold/20 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.16em] text-sya-gold">
              <span aria-hidden="true">🎓</span>
              {t.pageBadge}
            </span>
            <h1 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
              {t.pageTitle}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-white/60 sm:text-base">{t.pageSubtitle}</p>
          </div>
          <p className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/50 sm:text-xs">
            HOME <span className="mx-1">›</span> {t.pageTitle}
            <span className="mx-1">›</span>
            <span className="font-bold text-sya-gold">{t.sidebarTitles[activeTab]}</span>
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 좌측 서브메뉴 + 우측 콘텐츠 분할 뷰                                */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pb-16 sm:pt-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr] lg:items-start lg:gap-8">
          {/* 좌측: 서브메뉴 카드 리스트 */}
          <nav aria-label="About SYA sub navigation" className="lg:sticky lg:top-24">
            <ul className="space-y-2">
              {TAB_META.map(({ id, caption, icon }) => {
                const active = activeTab === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setActiveTab(id)}
                      aria-current={active ? "true" : undefined}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-all ${
                        active
                          ? "border-transparent bg-gradient-to-r from-sya-navy to-sya-ink text-white shadow-lg shadow-sya-navy/20"
                          : "border-sya-ink/8 bg-white text-sya-ink hover:border-sya-navy/25 hover:shadow-sm"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          active
                            ? "bg-white/15 text-white"
                            : "bg-sya-navy/[0.06] text-sya-navy"
                        }`}
                      >
                        {icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[13px] font-bold leading-snug ${active ? "text-white" : "text-sya-ink"}`}>
                          {t.sidebarTitles[id]}
                        </span>
                        <span className={`block truncate text-[10px] font-medium ${active ? "text-white/70" : "text-sya-ink/45"}`}>
                          {caption}
                        </span>
                      </span>
                      <span className={active ? "text-white/70" : "text-sya-ink/25"}>
                        <IconChevron />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <ConsultSidebarCard lang={lang} />
          </nav>

          {/* 우측: 탭 콘텐츠 (AI스튜디오 원본처럼 하나의 카드 안에서 탭만 전환) */}
          <div className="rounded-2xl border border-sya-ink/8 bg-white p-5 shadow-sm shadow-sya-navy/5 sm:p-6 lg:p-8">
            {/* ============================== 1. 학원소개 ============================== */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
                <div>
                  <span className="inline-block rounded bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                    {t.overview.badge}
                  </span>
                  <h2 className="mb-4 mt-3 text-2xl font-black leading-tight text-sya-ink sm:text-3xl">
                    {t.overview.heading}
                  </h2>
                  {t.overview.paragraphs.map((p, i) => (
                    <p key={i} className="mb-4 text-sm leading-relaxed text-sya-ink/70 last:mb-6">
                      {p}
                    </p>
                  ))}
                  <div className="space-y-3">
                    {t.overview.checklist.map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="mt-0.5 shrink-0 text-sky-600">
                          <IconCheck />
                        </span>
                        <div>
                          <strong className="block text-sm font-bold text-sya-ink">{item.title}</strong>
                          <p className="text-xs text-sya-ink/55">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-sya-ink/8 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={OVERVIEW_IMAGE}
                    alt="SYA Campus Overview"
                    className="h-[420px] w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-slate-950/80 via-transparent to-transparent p-6">
                    <div className="text-white">
                      <span className="block text-xs font-bold uppercase tracking-wider text-amber-300">
                        {t.overview.imageBadge}
                      </span>
                      <p className="text-base font-bold">{t.overview.imageCaption}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================== 2. 원장 인사말 ============================== */}
            {activeTab === "director" && (
              <div className="mx-auto max-w-3xl rounded-2xl border border-sya-ink/8 bg-sya-soft p-6 sm:p-10">
                <div className="flex flex-col items-center gap-6 border-b border-sya-ink/8 pb-8 sm:flex-row sm:items-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={DIRECTOR_IMAGE}
                    alt="SYA Director"
                    className="h-28 w-28 shrink-0 rounded-full border-4 border-white object-cover shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <div className="text-center sm:text-start">
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
                      {t.director.badge}
                    </span>
                    <h2 className="mt-1 text-xl font-black leading-snug text-sya-ink sm:text-2xl">
                      &ldquo;{t.director.quote}&rdquo;
                    </h2>
                    <p className="mt-1 text-xs text-sya-ink/50">{t.director.name}</p>
                  </div>
                </div>
                <div className="space-y-4 pt-8 text-sm leading-relaxed text-sya-ink/75">
                  {t.director.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                  <p className="pt-2 font-bold text-sya-ink">{t.director.closing}</p>
                </div>
              </div>
            )}

            {/* ============================== 3. 전문 강사진 시스템 ============================== */}
            {activeTab === "faculty" && (
              <div className="space-y-8">
                <div className="mx-auto max-w-3xl text-center">
                  <h2 className="text-xl font-black text-sya-ink sm:text-2xl">{t.faculty.heading}</h2>
                  <p className="mt-2 text-xs text-sya-ink/60 sm:text-sm">{t.faculty.subtitle}</p>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {t.faculty.cards.map((card, i) => (
                    <div key={i} className="rounded-2xl border border-sya-ink/8 bg-sya-soft p-6 text-center">
                      <div
                        className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${
                          FACULTY_ICON_BG[card.icon] ?? "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {FACULTY_ICON_MAP[card.icon] ?? <IconAward />}
                      </div>
                      <h3 className="text-base font-black text-sya-ink">{card.title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-sya-ink/60">{card.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================== 4. 캠퍼스 시설 & 안전 ============================== */}
            {activeTab === "facility" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-sya-ink sm:text-2xl">{t.facility.heading}</h2>
                  <p className="mt-1 text-xs text-sya-ink/55 sm:text-sm">{t.facility.subtitle}</p>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {t.facility.cards.map((card, i) => (
                    <div key={i} className="overflow-hidden rounded-2xl border border-sya-ink/8 bg-sya-soft">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={FACILITY_IMAGES[i] ?? FACILITY_IMAGES[0]}
                        alt={card.title}
                        className="h-44 w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="p-5">
                        <h3 className="text-base font-bold text-sya-ink">{card.title}</h3>
                        <p className="mt-1 text-xs text-sya-ink/60">{card.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================== 5. 오시는 길 ============================== */}
            {activeTab === "location" && (
              <div className="rounded-2xl border border-sya-ink/8 bg-sya-soft p-6 sm:p-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
                      {t.location.badge}
                    </span>
                    <h2 className="mb-4 mt-1 text-xl font-black leading-snug text-sya-ink sm:text-2xl">
                      {t.location.heading}
                    </h2>
                    <p className="mb-6 text-xs leading-relaxed text-sya-ink/65 sm:text-sm">
                      {t.location.paragraph}
                    </p>
                    <div className="space-y-3 text-xs text-sya-ink/75">
                      {t.location.infoCards.map((card, i) => (
                        <div key={i} className="rounded-xl border border-sya-ink/8 bg-white p-3">
                          <strong className="mb-1 block font-bold text-sya-ink">{card.title}</strong>
                          {card.description}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between rounded-xl bg-sya-navy p-6 text-white">
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-amber-400">
                        <IconPin />
                        <span>{t.location.darkBox.addressBadge}</span>
                      </div>
                      <h3 className="mb-2 text-lg font-bold text-white">{t.location.darkBox.campusName}</h3>
                      {/* 주소·전화: 관리자 설정 > 학원 기본정보 (비어 있으면 기존 기본값). <bdi>로 아랍어(RTL) 화면 방향 격리 */}
                      <div className="mb-4 space-y-1.5 text-xs leading-relaxed text-slate-300">
                        <p>
                          <strong className="text-slate-200">{t.location.darkBox.campusAddressLabel}:</strong>{" "}
                          <bdi>{contact.campusAddress}</bdi>
                        </p>
                        <p>
                          <strong className="text-slate-200">{t.location.darkBox.officeAddressLabel}:</strong>{" "}
                          <bdi>{contact.philippinesOfficeAddress}</bdi>
                        </p>
                      </div>

                      <div className="space-y-2 border-t border-slate-800 pt-4 text-xs text-slate-400">
                        <p>
                          <strong className="text-slate-200">{t.location.darkBox.phoneKoreaLabel}:</strong>{" "}
                          <a href={toTelHref(contact.koreaPhone)} className="hover:text-white">
                            <bdi dir="ltr">{contact.koreaPhone}</bdi>
                          </a>
                        </p>
                        <p>
                          <strong className="text-slate-200">{t.location.darkBox.phonePhLabel}:</strong>{" "}
                          <a href={toTelHref(contact.localPhone)} className="hover:text-white">
                            <bdi dir="ltr">{contact.localPhone}</bdi>
                          </a>
                        </p>
                        <p>
                          <strong className="text-slate-200">{t.location.darkBox.kakaoLabel}:</strong>{" "}
                          {t.location.darkBox.kakao}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openConsultation()}
                      className="mt-6 w-full rounded-xl bg-sky-600 py-3 text-xs font-bold text-white transition-colors hover:bg-sky-500"
                    >
                      {t.location.ctaLabel}
                    </button>
                  </div>
                </div>

                {/* 구글맵 임베드: 관리자 설정의 필리핀 사무소 주소 기준 (비어 있으면 기존 노블 호텔 세부 위치) */}
                <div className="mt-6 overflow-hidden rounded-xl border border-sya-ink/8">
                  <iframe
                    title="SYA Campus Location - The Noble Cebu"
                    src={officeMapEmbedSrc(contact.philippinesOfficeAddress)}
                    width="100%"
                    height="320"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
