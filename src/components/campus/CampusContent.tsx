"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Locale } from "@/config/i18n";
import type { CampusDictionary } from "@/types/dictionary";
import ConsultSidebarCard from "@/components/common/ConsultSidebarCard";

interface CampusContentProps {
  lang: Locale;
  /** 필리핀 생활안내 8개 언어 사전 (src/dictionaries/campus/<lang>.json) */
  copy: CampusDictionary;
}

type SectionId = "meals" | "activities" | "visa" | "pickup" | "localLife" | "packing";
type MealTab = "lunch" | "dinner" | "breakfast" | "globalDay" | "fruit" | "weekly";
type ActivityCategory = "all" | "marine" | "history" | "waterpark";

/* ------------------------------------------------------------------ */
/* 공통 플레이스홀더 썸네일 (외부 이미지 의존 없이 안전하게)                  */
/* ------------------------------------------------------------------ */
function PlaceholderThumb({ label, emoji = "📷" }: { label?: string; emoji?: string }) {
  return (
    <div className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-sya-navy/[0.06] to-sya-gold/[0.08] text-sya-navy/35">
      <span className="text-2xl" aria-hidden="true">{emoji}</span>
      {label && <span className="px-2 text-center text-[10px] font-medium leading-snug">{label}</span>}
    </div>
  );
}

// 열대과일 디저트 코너 실사진 3장 (fruitCaptions 순서: 망고&파파야 / 제철과일코너 / 수박·파인애플·바나나)
const FRUIT_IMAGES = [
  "/images/sya-photos/fruit/fruit-1.png",
  "/images/sya-photos/fruit/fruit-2.png",
  "/images/sya-photos/fruit/fruit-3.png",
];
// 점심 9종 실제 메뉴 사진 (사전 lunchSets 배열 순서와 1:1로 정확히 매칭됨)
const LUNCH_DISH_IMAGES = [
  "/images/sya-photos/lunch/lunch-1.png",
  "/images/sya-photos/lunch/lunch-2.png",
  "/images/sya-photos/lunch/lunch-3.png",
  "/images/sya-photos/lunch/lunch-4.png",
  "/images/sya-photos/lunch/lunch-5.png",
  "/images/sya-photos/lunch/lunch-6.png",
  "/images/sya-photos/lunch/lunch-7.png",
  "/images/sya-photos/lunch/lunch-8.png",
  "/images/sya-photos/lunch/lunch-9.png",
];

// 저녁 9종 실제 메뉴 사진 (사전 dinnerSets 배열 순서와 1:1로 정확히 매칭됨)
const DINNER_DISH_IMAGES = [
  "/images/sya-photos/dinner/dinner-1.png",
  "/images/sya-photos/dinner/dinner-2.png",
  "/images/sya-photos/dinner/dinner-3.png",
  "/images/sya-photos/dinner/dinner-4.png",
  "/images/sya-photos/dinner/dinner-5.png",
  "/images/sya-photos/dinner/dinner-6.png",
  "/images/sya-photos/dinner/dinner-7.png",
  "/images/sya-photos/dinner/dinner-8.png",
  "/images/sya-photos/dinner/dinner-9.png",
];

function getMealSetImage(tab: "lunch" | "dinner", index: number): string {
  const pool = tab === "lunch" ? LUNCH_DISH_IMAGES : DINNER_DISH_IMAGES;
  return pool[index] ?? pool[0];
}

// 액티비티 투어별 현장 사진 3장 (투어 slug 기준 매핑 — TOUR_META의 slug로 매칭됨)
const TOUR_IMAGES: Record<string, string[]> = {
  oslob: [
    "/images/sya-photos/activities/oslob-1.png",
    "/images/sya-photos/activities/oslob-2.png",
    "/images/sya-photos/activities/oslob-3.png",
  ],
  "island-hopping": [
    "/images/sya-photos/activities/island-hopping-1.png",
    "/images/sya-photos/activities/island-hopping-2.png",
    "/images/sya-photos/activities/island-hopping-3.png",
  ],
  kawasan: [
    "/images/sya-photos/activities/kawasan-1.png",
    "/images/sya-photos/activities/kawasan-2.png",
    "/images/sya-photos/activities/kawasan-3.png",
  ],
  "fort-san-pedro": [
    "/images/sya-photos/activities/fort-san-pedro-1.png",
    "/images/sya-photos/activities/fort-san-pedro-2.png",
    "/images/sya-photos/activities/fort-san-pedro-3.png",
  ],
  "magellan-cross": [
    "/images/sya-photos/activities/magellan-cross-1.png",
    "/images/sya-photos/activities/magellan-cross-2.png",
    "/images/sya-photos/activities/magellan-cross-3.png",
  ],
  "city-tour": [
    "/images/sya-photos/activities/city-tour-1.png",
    "/images/sya-photos/activities/city-tour-2.png",
    "/images/sya-photos/activities/city-tour-3.png",
  ],
  waterworld: [
    "/images/sya-photos/activities/waterworld-1.png",
    "/images/sya-photos/activities/waterworld-2.png",
    "/images/sya-photos/activities/waterworld-3.png",
  ],
  "ice-skating": [
    "/images/sya-photos/activities/ice-skating-1.png",
    "/images/sya-photos/activities/ice-skating-2.png",
    "/images/sya-photos/activities/ice-skating-3.png",
  ],
};

/* ------------------------------------------------------------------ */
/* 아이콘                                                              */
/* ------------------------------------------------------------------ */
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
function IconMeal() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3v8a2 2 0 0 0 4 0V3M8 11v10M17 3c-1.7 0-3 1.8-3 5s1.3 5 3 5v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCompass() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15 9l-2 6-6 2 2-6 6-2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
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
function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 10.5l2.5 2.5L14 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconWarning() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4l9 16H3L12 4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 10v4M12 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconPassport() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6" y="2.5" width="12" height="19" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 15h6M9.5 17.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function IconCoin() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15" cy="15" r="6" stroke="currentColor" strokeWidth="1.6" opacity="0.6" />
    </svg>
  );
}
function IconSuitcase() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="17" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M3.5 12h17" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.5 21 3 13.5 3 4.7c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

const SECTION_META: { id: SectionId; icon: React.ReactNode; captionEn: string }[] = [
  { id: "meals", icon: <IconMeal />, captionEn: "Weekly Meal Plan" },
  { id: "activities", icon: <IconCompass />, captionEn: "Weekend Activities" },
  { id: "visa", icon: <IconPassport />, captionEn: "Visa & SSP Info" },
  { id: "pickup", icon: <IconPlane />, captionEn: "Airport Pick-up" },
  { id: "localLife", icon: <IconCoin />, captionEn: "Local Life & Cost" },
  { id: "packing", icon: <IconSuitcase />, captionEn: "Packing Checklist" },
];

/* ==================================================================== */
/* 언어와 무관한 구조 데이터                                               */
/* 화면에 표시되는 문구는 모두 src/dictionaries/campus/<lang>.json (8개 언어)에서 */
/* 불러오며, 아래 배열은 사전의 배열과 같은 순서로 1:1 매칭된다.                 */
/* ==================================================================== */

// 다국적 전통음식 Day 국기 (globalDayCountries 순서와 동일)
const GLOBAL_DAY_FLAGS = ["🇰🇷", "🇨🇳", "🇯🇵", "🇹🇼", "🇻🇳", "🇵🇭", "🇹🇭", "🇲🇳", "🇷🇺"];

// 주간 식단표에서 강조(⭐)할 행 — 목요일 Global Day (weeklyTable 순서 기준)
const WEEKLY_HIGHLIGHT_ROWS = [3];

// 액티비티 투어 구조 정보 (tours 순서와 동일, badgeEn은 전 언어 공통 영문 배지)
const TOUR_META: { slug: string; category: Exclude<ActivityCategory, "all">; badgeEn: string }[] = [
  { slug: "oslob", category: "marine", badgeEn: "Oslob Whale Shark Experience" },
  { slug: "island-hopping", category: "marine", badgeEn: "Island Hopping & Snorkeling Tour" },
  { slug: "kawasan", category: "marine", badgeEn: "Kawasan Extreme Canyoneering" },
  { slug: "fort-san-pedro", category: "history", badgeEn: "Fort San Pedro & Heritage Tour" },
  { slug: "magellan-cross", category: "history", badgeEn: "Magellan's Cross & Santo Niño Basilica" },
  { slug: "city-tour", category: "history", badgeEn: "Cebu City & Heritage Highlights Tour" },
  { slug: "waterworld", category: "waterpark", badgeEn: "Cebu Water World Park" },
  { slug: "ice-skating", category: "waterpark", badgeEn: "SM Seaside Ice Skating Rink" },
];

/* ==================================================================== */
/* 컴포넌트 본문                                                          */
/* ==================================================================== */
export default function CampusContent({ lang, copy }: CampusContentProps) {
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<SectionId>("meals");
  const [activeMealTab, setActiveMealTab] = useState<MealTab>("lunch");
  const [activeCategory, setActiveCategory] = useState<ActivityCategory>("all");

  const SECTION_IDS: SectionId[] = ["meals", "activities", "visa", "pickup", "localLife", "packing"];

  // 헤더 드롭다운 등에서 ?tab=visa 같은 쿼리로 들어오면 해당 섹션을 바로 열어준다.
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && SECTION_IDS.includes(tabParam as SectionId)) {
      setActiveSection(tabParam as SectionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("tab")]);

  const {
    page,
    meals: mealsUi,
    activities: activitiesUi,
    lunchSets,
    dinnerSets,
    breakfastCombos,
    breakfastAlways,
    visa,
    pickup,
    localLife,
    packing,
  } = copy;
  const globalDayCountries = copy.globalDayCountries.map((country, i) => ({
    ...country,
    flag: GLOBAL_DAY_FLAGS[i] ?? "",
  }));
  const weeklyTable = copy.weeklyTable.map((row, i) => ({
    ...row,
    star: WEEKLY_HIGHLIGHT_ROWS.includes(i),
  }));
  const tours = copy.tours.map((tour, i) => ({ ...tour, ...TOUR_META[i] }));
  const sidebarTitles: Record<SectionId, string> = {
    meals: mealsUi.sidebarTitle,
    activities: activitiesUi.sidebarTitle,
    visa: visa.sidebarTitle,
    pickup: pickup.sidebarTitle,
    localLife: localLife.sidebarTitle,
    packing: packing.sidebarTitle,
  };

  const filteredTours = activeCategory === "all" ? tours : tours.filter((tour) => tour.category === activeCategory);

  return (
    <main className="bg-sya-soft">
      {/* 상단 다크 배너 */}
      <section className="bg-gradient-to-br from-sya-navy via-sya-navy to-sya-navy px-5 py-7 sm:px-8 sm:py-9">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sya-gold/20 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.16em] text-sya-gold">
              <span aria-hidden="true">🎓</span>
              Philippines Life Guide
            </span>
            <h1 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
              {page.title}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-white/60 sm:text-base">
              {page.subtitle}
            </p>
          </div>
          <p className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/50 sm:text-xs">
            HOME <span className="mx-1">›</span> {page.title}
            <span className="mx-1">›</span>
            <span className="font-bold text-sya-gold">{sidebarTitles[activeSection]}</span>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pb-16 sm:pt-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr] lg:items-start lg:gap-8">
          {/* 좌측 사이드바 */}
          <nav aria-label="Campus sub navigation" className="lg:sticky lg:top-24">
            <ul className="space-y-2">
              {SECTION_META.map(({ id, icon, captionEn }) => {
                const active = activeSection === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setActiveSection(id)}
                      aria-current={active ? "true" : undefined}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-all ${
                        active
                          ? "border-transparent bg-gradient-to-r from-sya-navy to-sya-ink text-white shadow-lg shadow-sya-navy/20"
                          : "border-sya-ink/8 bg-white text-sya-ink hover:border-sya-navy/25 hover:shadow-sm"
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-white/15 text-white" : "bg-sya-navy/[0.06] text-sya-navy"}`}>
                        {icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[13px] font-bold leading-snug ${active ? "text-white" : "text-sya-ink"}`}>
                          {sidebarTitles[id]}
                        </span>
                        <span className={`block truncate text-[10px] font-medium ${active ? "text-white/70" : "text-sya-ink/45"}`}>
                          {captionEn}
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
            <ConsultSidebarCard lang={lang} copy={copy.consultCard} />
          </nav>

          {/* 우측 콘텐츠 */}
          <div>
            {/* ============================== 1. 식단정보 ============================== */}
            {activeSection === "meals" && (
              <div>
                <div className="rounded-2xl border border-sya-ink/8 bg-gradient-to-br from-sya-soft to-white p-6 shadow-sm shadow-sya-navy/5 sm:p-8">
                  <span className="rounded-full bg-sya-gold/20 px-3 py-1 text-xs font-bold text-sya-gold-deep">
                    {mealsUi.heroBadge}
                  </span>
                  <h2 className="mt-4 text-2xl font-bold text-sya-navy sm:text-3xl">{mealsUi.heroHeading}</h2>
                  <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-sya-ink/65">{mealsUi.heroDesc}</p>
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {(["breakfast", "lunch", "dinner"] as const).map((key) => (
                      <div key={key} className="rounded-xl bg-white p-3 text-center shadow-sm">
                        <p className="text-[11px] font-medium text-sya-ink/50">{mealsUi.timeLabels[key]}</p>
                        <p className="mt-1 text-sm font-bold text-sya-navy">{mealsUi.timeValues[key]}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {mealsUi.checklist.map((item, i) => (
                      <p key={i} className="flex items-center gap-1.5 text-xs font-medium text-sya-ink/60">
                        <span className="text-emerald-600"><IconCheck /></span>{item}
                      </p>
                    ))}
                  </div>
                </div>

                {/* 서브탭 */}
                <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
                  {(Object.keys(mealsUi.tabs) as MealTab[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveMealTab(key)}
                      className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                        activeMealTab === key
                          ? "bg-sya-navy text-white"
                          : "bg-sya-navy/[0.06] text-sya-navy/70 hover:bg-sya-navy/[0.1]"
                      }`}
                    >
                      {mealsUi.tabs[key]}
                    </button>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-sya-ink/8 bg-white p-5 shadow-sm shadow-sya-navy/5 sm:p-6">
                  {/* 점심 / 저녁 (동일 구조) */}
                  {(activeMealTab === "lunch" || activeMealTab === "dinner") && (
                    <div>
                      <h3 className="text-lg font-bold text-sya-navy">
                        {activeMealTab === "lunch" ? mealsUi.lunchGalleryTitle : mealsUi.dinnerGalleryTitle}
                      </h3>
                      <p className="mt-1 text-sm text-sya-ink/55">
                        {activeMealTab === "lunch" ? mealsUi.lunchGallerySubtitle : mealsUi.dinnerGallerySubtitle}
                      </p>
                      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
                        {(activeMealTab === "lunch" ? lunchSets : dinnerSets).map((set, i) => (
                          <div key={i} className="overflow-hidden rounded-xl border border-sya-ink/8">
                            <div className="relative aspect-square overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getMealSetImage(activeMealTab as "lunch" | "dinner", i)}
                                alt={set.title}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <span className="absolute start-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                                SET {String(i + 1).padStart(2, "0")}
                              </span>
                            </div>
                            <div className="p-3.5">
                              <div className="flex flex-wrap gap-1">
                                {set.tags.map((tag, ti) => (
                                  <span key={ti} className="rounded bg-sya-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-sya-gold-deep">{tag}</span>
                                ))}
                              </div>
                              <p className="mt-2 text-sm font-bold text-sya-navy">{set.title}</p>
                              <p className="mt-1 text-xs leading-relaxed text-sya-ink/55">{set.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 조식 */}
                  {activeMealTab === "breakfast" && (
                    <div>
                      <h3 className="text-lg font-bold text-sya-navy">{mealsUi.breakfastHeading}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-sya-ink/65">{mealsUi.breakfastDesc}</p>
                      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {breakfastCombos.map((combo, i) => (
                          <div key={i} className="rounded-xl bg-sya-navy/[0.03] p-4">
                            <span className="rounded bg-sya-navy/10 px-2 py-0.5 text-[10px] font-bold text-sya-navy">
                              {page.breakfastComboLabel.replace("{n}", String(i + 1))}
                            </span>
                            <p className="mt-2 text-xs leading-relaxed text-sya-ink/60">{combo}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 rounded-xl border border-sya-ink/8 p-4">
                        <p className="text-sm font-bold text-sya-navy">{mealsUi.breakfastAlwaysTitle}</p>
                        <ul className="mt-2 space-y-1.5">
                          {breakfastAlways.map((item, i) => (
                            <li key={i} className="text-sm text-sya-ink/65">{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* 다국적 전통음식 Day */}
                  {activeMealTab === "globalDay" && (
                    <div>
                      <h3 className="text-lg font-bold text-sya-navy">{mealsUi.globalDayHeading}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-sya-ink/65">{mealsUi.globalDayDesc}</p>
                      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {globalDayCountries.map((country, i) => (
                          <div key={i} className="rounded-xl border border-sya-ink/8 p-4">
                            <p className="flex items-center gap-2 text-sm font-bold text-sya-navy">
                              <span className="text-lg">{country.flag}</span>{country.name}
                            </p>
                            <p className="mt-1.5 text-xs leading-relaxed text-sya-ink/55">{country.desc}</p>
                            <p className="mt-2 text-[11px] font-semibold text-sya-gold-deep">{mealsUi.globalDayMenuLabel}</p>
                            <p className="text-[11px] leading-relaxed text-sya-ink/50">{country.menu}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 열대과일 */}
                  {activeMealTab === "fruit" && (
                    <div>
                      <h3 className="text-lg font-bold text-sya-navy">{mealsUi.fruitHeading}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-sya-ink/65">{mealsUi.fruitDesc}</p>
                      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {mealsUi.fruitCaptions.map((caption, i) => (
                          <div key={i}>
                            <div className="relative aspect-square overflow-hidden rounded-xl">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={FRUIT_IMAGES[i % FRUIT_IMAGES.length]}
                                alt={caption}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <p className="mt-2 text-xs text-sya-ink/55">{caption}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 주간 식단표 */}
                  {activeMealTab === "weekly" && (
                    <div>
                      <h3 className="text-lg font-bold text-sya-navy">{mealsUi.weeklyHeading}</h3>
                      <p className="mt-1 text-xs text-sya-ink/45">{mealsUi.weeklyNote}</p>
                      <div className="mt-4 overflow-x-auto rounded-xl border border-sya-ink/8">
                        <table className="w-full min-w-[720px] border-collapse text-left text-xs rtl:text-right">
                          <thead>
                            <tr className="bg-sya-navy text-white">
                              <th className="w-24 px-3 py-2.5 font-semibold">{mealsUi.weeklyDayHeader}</th>
                              <th className="px-3 py-2.5 font-semibold">{mealsUi.weeklyBreakfastHeader}</th>
                              <th className="px-3 py-2.5 font-semibold">{mealsUi.weeklyLunchHeader}</th>
                              <th className="px-3 py-2.5 font-semibold">{mealsUi.weeklyDinnerHeader}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {weeklyTable.map((row, i) => (
                              <tr key={i} className={row.star ? "bg-sya-gold/10" : i % 2 === 0 ? "bg-white" : "bg-sya-navy/[0.03]"}>
                                <td className="px-3 py-2.5 font-bold text-sya-navy">
                                  {row.star && <span className="me-1">⭐</span>}{row.day}
                                </td>
                                <td className="px-3 py-2.5 text-sya-ink/65">{row.breakfast}</td>
                                <td className="px-3 py-2.5 text-sya-ink/65">{row.lunch}</td>
                                <td className="px-3 py-2.5 text-sya-ink/65">{row.dinner}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 위생 안전 원칙 (모든 식단 탭 공통 하단) */}
                  <div className="mt-8 rounded-xl border border-emerald-100 bg-emerald-50/50 p-5">
                    <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                      <IconShield />{mealsUi.safetyHeading}
                    </p>
                    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {mealsUi.safetyBullets.map((bullet, i) => (
                        <li key={i} className="text-xs leading-relaxed text-emerald-900/70">• {bullet}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* ============================== 4. 액티비티 ============================== */}
            {activeSection === "activities" && (
              <div>
                <div className="relative overflow-hidden rounded-2xl border border-sya-ink/8 p-6 shadow-sm shadow-sya-navy/5 sm:p-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/sya-photos/activity-island.png"
                    alt={page.activityImageAlt}
                    className="absolute inset-0 h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/90 to-sya-soft/85" />
                  <div className="relative">
                    <span className="rounded-full bg-sya-navy/10 px-3 py-1 text-xs font-bold text-sya-navy">
                      {activitiesUi.heroBadge}
                    </span>
                    <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-sya-navy sm:text-3xl">{activitiesUi.heroHeading}</h2>
                        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-sya-ink/65">{activitiesUi.heroDesc}</p>
                      </div>
                      <div className="rounded-xl bg-white px-5 py-3 text-center shadow-sm">
                        <p className="text-[11px] font-medium text-sya-ink/45">{activitiesUi.heroBoxLabel}</p>
                        <p className="text-base font-bold text-sya-navy">{activitiesUi.heroBoxValue}</p>
                        <p className="text-[10px] text-sya-ink/40">{activitiesUi.heroBoxNote}</p>
                      </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {activitiesUi.checklist.map((item, i) => (
                        <p key={i} className="flex items-center gap-1.5 text-xs font-medium text-sya-ink/60">
                          <span className="text-emerald-600"><IconCheck /></span>{item}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 필터 탭 */}
                <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
                  {(Object.keys(activitiesUi.filters) as ActivityCategory[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveCategory(key)}
                      className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                        activeCategory === key
                          ? "bg-sya-navy text-white"
                          : "bg-sya-navy/[0.06] text-sya-navy/70 hover:bg-sya-navy/[0.1]"
                      }`}
                    >
                      {activitiesUi.filters[key]}
                    </button>
                  ))}
                </div>

                {/* 투어 카드 목록 */}
                <div className="mt-6 space-y-8">
                  {filteredTours.map((tour, i) => {
                    const images = TOUR_IMAGES[tour.slug] ?? [];
                    return (
                      <article
                        key={i}
                        className="overflow-hidden rounded-2xl border border-sya-ink/8 bg-white shadow-sm shadow-sya-navy/5 transition-shadow hover:shadow-lg hover:shadow-sya-navy/10"
                      >
                        {/* 커버 이미지 + 오버레이 타이틀 */}
                        <div className="relative aspect-[16/9] w-full overflow-hidden sm:aspect-[21/9]">
                          {images[0] && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={images[0]}
                              alt={tour.title}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-sya-navy/90 via-sya-navy/10 to-transparent" />
                          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-white/15 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
                                {tour.badgeEn}
                              </span>
                              <span className="rounded-full bg-sya-gold/90 px-2.5 py-1 text-xs font-semibold text-sya-navy">
                                {`${page.difficultyLabel}: ${tour.difficulty}`}
                              </span>
                            </div>
                            <h3 className="mt-3 text-xl font-extrabold text-white drop-shadow-sm sm:text-2xl">{tour.title}</h3>
                            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/80">
                              <span className="flex items-center gap-1"><IconPin />{tour.location}</span>
                              <span>🕒 {tour.duration}</span>
                            </p>
                          </div>
                        </div>

                        <div className="p-5 sm:p-6">
                          <p className="text-sm leading-relaxed text-sya-ink/65">{tour.desc}</p>

                          {images.length > 1 && (
                            <div className="mt-5">
                              <p className="text-xs font-bold uppercase tracking-wide text-sya-ink/45">{activitiesUi.galleryLabel}</p>
                              <div className="mt-2 grid grid-cols-3 gap-2">
                              {images.map((src, gi) => (
                                <div key={gi} className="group relative aspect-square overflow-hidden rounded-xl">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={src}
                                    alt={`${tour.title} ${gi + 1}`}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
                                </div>
                              ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wide text-sya-ink/45">{activitiesUi.highlightsLabel}</p>
                              <ul className="mt-2 space-y-2">
                                {tour.highlights.map((h, hi) => (
                                  <li key={hi} className="flex items-start gap-2 text-sm leading-relaxed text-sya-ink/70">
                                    <span className="mt-0.5 text-emerald-600"><IconCheck /></span>{h}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="rounded-xl bg-sya-navy/[0.03] p-4">
                              <p className="text-xs font-bold uppercase tracking-wide text-sya-ink/45">{activitiesUi.scheduleLabel}</p>
                              <p className="mt-1.5 text-sm text-sya-ink/65">{tour.schedule}</p>
                              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-sya-ink/8 pt-3 text-xs text-sya-ink/55">
                                <span><strong className="text-sya-navy">{activitiesUi.applyLabel}:</strong> {activitiesUi.applyValue}</span>
                                <span><strong className="text-sya-navy">{activitiesUi.minGroupLabel}:</strong> {activitiesUi.minGroupValue}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* 안전 유의사항 */}
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-5">
                  <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
                    <IconWarning />{activitiesUi.safetyHeading}
                  </p>
                  <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {activitiesUi.safetyBullets.map((bullet, i) => (
                      <li key={i} className="text-xs leading-relaxed text-amber-900/70">• {bullet}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* ============================== 5. 비자 & SSP (입학안내에서 이관) ============================== */}
            {activeSection === "visa" && (
              <div className="rounded-2xl border border-sya-ink/8 bg-white p-5 shadow-sm shadow-sya-navy/5 sm:p-6">
                <h2 className="text-2xl font-bold text-sya-navy sm:text-3xl">{visa.heading}</h2>
                <div className="mt-6 space-y-4">
                  {visa.items.map((item, i) => (
                    <div key={i} className="rounded-xl bg-sya-navy/[0.03] p-4">
                      <p className="flex items-center gap-2 text-sm font-bold text-sya-navy">
                        <span className="h-1.5 w-1.5 rounded-full bg-sya-navy" />{item.title}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-sya-ink/65">{item.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
                    <IconWarning />{visa.warning.split(":")[0]}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-amber-900/70">
                    {visa.warning.split(":").slice(1).join(":").trim()}
                  </p>
                </div>
              </div>
            )}

            {/* ============================== 6. 공항 픽업 (입학안내에서 이관) ============================== */}
            {activeSection === "pickup" && (
              <div className="rounded-2xl border border-sya-ink/8 bg-white p-5 shadow-sm shadow-sya-navy/5 sm:p-6">
                <h2 className="text-2xl font-bold text-sya-navy sm:text-3xl">{pickup.heading}</h2>
                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {pickup.cards.map((card, i) => (
                    <div key={i} className="rounded-xl border border-sya-ink/8 p-4">
                      <span className="inline-block rounded-md bg-sya-navy/[0.06] px-2.5 py-1 text-[11px] font-semibold text-sya-navy">
                        {card.tag}
                      </span>
                      <p className="mt-2.5 text-sm font-bold text-sya-navy">{card.title}</p>
                      <ul className="mt-2 space-y-1.5">
                        {card.bullets.map((b, bi) => (
                          <li key={bi} className="text-xs leading-relaxed text-sya-ink/60">• {b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-xl bg-blue-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-blue-800">
                    <IconPhone />{pickup.hotlineTitle}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-blue-900/70">{pickup.hotlineDesc}</p>
                </div>
              </div>
            )}

            {/* ============================== 7. 현지 생활 & 물가 (입학안내에서 이관) ============================== */}
            {activeSection === "localLife" && (
              <div className="rounded-2xl border border-sya-ink/8 bg-white p-5 shadow-sm shadow-sya-navy/5 sm:p-6">
                <h2 className="text-2xl font-bold text-sya-navy sm:text-3xl">{localLife.heading}</h2>
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {localLife.cards.map((card, i) => (
                    <div key={i} className="rounded-xl border border-sya-ink/8 p-4 text-center">
                      <p className="text-[11px] font-medium text-sya-ink/50">{card.label}</p>
                      <p className="mt-1.5 text-lg font-extrabold text-sya-navy">{card.value}</p>
                      <p className="mt-1 text-[11px] text-sya-ink/45">{card.note}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 space-y-3">
                  {localLife.bullets.map((b, i) => {
                    const [head, ...rest] = b.split(":");
                    return (
                      <p key={i} className="rounded-xl bg-sya-navy/[0.03] p-4 text-sm leading-relaxed text-sya-ink/65">
                        <strong className="text-sya-navy">{head}:</strong>{rest.join(":")}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============================== 8. 출국 준비물 (입학안내에서 이관) ============================== */}
            {activeSection === "packing" && (
              <div className="rounded-2xl border border-sya-ink/8 bg-white p-5 shadow-sm shadow-sya-navy/5 sm:p-6">
                <h2 className="text-2xl font-bold text-sya-navy sm:text-3xl">{packing.heading}</h2>
                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {packing.categories.map((cat, i) => (
                    <div key={i} className="rounded-xl border border-sya-ink/8 p-4">
                      <p className="border-b border-sya-ink/8 pb-2 text-sm font-bold text-sya-navy">{cat.title}</p>
                      <ul className="mt-3 space-y-2">
                        {cat.items.map((item, ii) => (
                          <li key={ii} className="flex items-start gap-2 text-xs leading-relaxed text-sya-ink/65">
                            <span className="mt-0.5 text-emerald-600"><IconCheck /></span>{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
