"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { isRtlLocale, type Locale } from "@/config/i18n";
import { isolateLtrDeep } from "@/lib/bidi";
import type { Dictionary } from "@/types/dictionary";
import CostCalculator from "@/components/calculator/CostCalculator";
import TuitionSection from "@/components/tuition/TuitionSection";
import { LOCAL_FEES, LOCAL_FEE_IDS } from "@/config/localFees";
import ConsultSidebarCard from "@/components/common/ConsultSidebarCard";
import { useConsultationModal } from "@/components/common/ConsultationModalProvider";

interface ServicesContentProps {
  lang: Locale;
  dict: Dictionary;
}

type SectionId = "tuition" | "dormitory" | "calculator" | "localExpenses" | "refundPolicy";
const SECTION_IDS: SectionId[] = ["tuition", "dormitory", "calculator", "localExpenses", "refundPolicy"];

function isSectionId(value: string | null): value is SectionId {
  return !!value && (SECTION_IDS as string[]).includes(value);
}

/* ------------------------------------------------------------------ */
/* 아이콘                                                              */
/* ------------------------------------------------------------------ */
function IconDoc() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3h9l4 4v14H6V3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M15 3v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12h6M9 16h6M9 8h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function IconHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function IconCalculator() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 7h8M8 11h1M11.5 11h1M15 11h1M8 14.5h1M11.5 14.5h1M15 14.5h1M8 18h1M11.5 18h1M15 18h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
function IconInfo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 11v6M12 8h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ==================================================================== */
/* UI 문구 (ko/en, 그 외 6개 언어는 en 폴백)                               */
/* ==================================================================== */
const UI = {
  ko: {
    pageBadge: "Tuition & Dormitory",
    pageTitle: "연수비용 & 기숙사",
    pageSubtitle: "투명하고 합리적인 정찰제 학비와 쾌적한 안심 기숙사 안내",
    consultButton: "상담 문의",
    quoteButton: "견적 계산",
    sidebar: {
      tuition: { title: "코스별 정규 학비 안내", caption: "Tuition Table" },
      dormitory: { title: "숙소 안내", caption: "Accommodation" },
      calculator: { title: "실시간 맞춤 견적 계산기", caption: "Quote Calculator" },
      localExpenses: { title: "현지 납부비용 안내", caption: "Local Expenses" },
      refundPolicy: { title: "SYA 환불 규정", caption: "Refund Policy" },
    },
    calculator: {
      breadcrumb: "연수비용 & 기숙사",
      title: "실시간 맞춤 견적 계산기",
      subtitle: "과정, 연수 기간, 참가자, 숙박 여부를 선택해 예상 비용을 확인하세요",
    },
    tuition: {
      breadcrumb: "연수비용 & 기숙사",
      title: "과정별 연수 비용",
      subtitle: "과정과 연수 기간에 따른 교육비 안내",
    },
    dormitory: {
      breadcrumb: "연수비용 & 기숙사",
      title: "숙소 안내",
      subtitle: "BE Pods Lahug 우선 배정 · 숙소 비용은 상담 시 안내",
      costLabel: "비용",
      costNote: "숙소 비용은 객실 및 일정에 따라 상담 시 안내해 드립니다.",
      exploreLink: "BE Pods Lahug 둘러보기 →",
      consultBtn: "숙소 상담 신청",
      bottomNote: "숙소 비용과 입실 관련 세부 사항은 객실 및 일정에 따라 상담 시 안내해 드립니다.",
      localLink: "현지 납부비용 전체 보기 →",
    },
    localExpenses: {
      breadcrumb: "연수비용 & 기숙사",
    },
    refundPolicy: {
      breadcrumb: "연수비용 & 기숙사",
      title: "SYA 환불 규정",
      subtitle: "실제 납부금액을 기준으로 투명하게 환불 금액을 산정합니다.",
      intro: "SYA의 환불 기준은 연수 시작 전과 시작 후를 구분하며, 시작 후 환불은 4주 단위로 산정합니다.",
      basis: "중요: 환불 금액은 할인 적용 후 최종금액 전체가 아니라 실제로 완료 수납된 금액을 기준으로 계산합니다. 이미 완료된 환불액은 차감됩니다.",
      beforeTitle: "출국 전 환불 기준",
      beforeRows: [
        ["출국 4주 전까지", "실제 납부액 기준 잔여 금액"],
        ["출국 2주 전까지", "2주분 숙박비를 제외한 잔여 금액"],
        ["출국 1주 전까지", "4주분 숙박비를 제외한 잔여 금액"],
        ["출국 3일 전부터", "4주분 학비와 4주분 숙박비를 제외한 잔여 금액"],
      ],
      afterTitle: "연수 시작 후 환불 기준",
      afterRows: [
        ["전체 기간 25% 이내", "잔여 환불 산정액의 70%"],
        ["전체 기간 50% 이내", "잔여 환불 산정액의 50%"],
        ["전체 기간 75% 이내", "잔여 환불 산정액의 30%"],
        ["전체 기간 75% 초과", "환불 불가"],
      ],
      notesTitle: "환불 시 유의사항",
      notes: [
        "환불은 4주 단위로 산정하며, 4주 미만의 잔여 기간은 환불 산정에서 제외될 수 있습니다.",
        "실제 납부하지 않은 미수금은 환불 대상이 아닙니다.",
        "환불 신청 후 관리자가 기준을 확인하여 최종 환불 가능액을 확정합니다.",
        "질병 등 부득이한 사유는 증빙서류 제출 여부에 따라 별도 상담이 필요할 수 있습니다.",
        "학원 규정 위반에 따른 퇴교 등 별도 사유가 있는 경우 환불이 제한될 수 있습니다.",
      ],
    },
    trustBar: {
      heading: "SYA 어학원 공인 인증 및 공식 인가 내역",
      items: [
        "필리핀 교육부 TESDA 정식 인가 교육기관 (TESDA Reg. No. 2018-09-0448)",
        "필리핀 이민국 SSP(Special Study Permit) 공인 인증 발급처 (AAFS No. RAD-2019-031)",
        "한국 유학협회 정회원 & 24시간 안전 가디언 상주 시스템",
      ],
    },
  },
  en: {
    pageBadge: "Tuition & Dormitory",
    pageTitle: "Tuition & Dormitory",
    pageSubtitle: "Transparent, fair fixed pricing and comfortable, secure dormitory information",
    consultButton: "Consult",
    quoteButton: "Get a Quote",
    sidebar: {
      tuition: { title: "Tuition by Course", caption: "Tuition Table" },
      dormitory: { title: "Accommodation", caption: "Accommodation" },
      calculator: { title: "Live Custom Quote Calculator", caption: "Quote Calculator" },
      localExpenses: { title: "Local Payment Guide", caption: "Local Expenses" },
      refundPolicy: { title: "SYA Refund Policy", caption: "Refund Policy" },
    },
    calculator: {
      breadcrumb: "Tuition & Dormitory",
      title: "Live Custom Quote Calculator",
      subtitle: "Choose a program, length of study, participants and accommodation to see your estimated cost",
    },
    tuition: {
      breadcrumb: "Tuition & Dormitory",
      title: "Tuition by Program",
      subtitle: "Tuition by program and length of study",
    },
    dormitory: {
      breadcrumb: "Tuition & Dormitory",
      title: "Accommodation",
      subtitle: "BE Pods Lahug first · Costs provided during consultation",
      costLabel: "Cost",
      costNote: "Accommodation costs depend on room and schedule and are provided during consultation.",
      exploreLink: "Explore BE Pods Lahug →",
      consultBtn: "Consult About Accommodation",
      bottomNote: "Accommodation costs and move-in details depend on room and schedule and are provided during consultation.",
      localLink: "See all local payment fees →",
    },
    localExpenses: {
      breadcrumb: "Tuition & Dormitory",
    },
    refundPolicy: {
      breadcrumb: "Tuition & Dormitory",
      title: "SYA Refund Policy",
      subtitle: "Refunds are calculated transparently based on the amount actually paid.",
      intro: "SYA separates pre-departure and post-start cancellation rules. After the course begins, refunds are calculated in four-week units.",
      basis: "Important: Refunds are calculated from the amount actually paid after discounts, not from the full final tuition amount. Completed refunds are deducted.",
      beforeTitle: "Before Departure",
      beforeRows: [
        ["Up to 4 weeks before departure", "Remaining amount based on actual payment"],
        ["Up to 2 weeks before departure", "Remaining amount after deducting 2 weeks of accommodation"],
        ["Up to 1 week before departure", "Remaining amount after deducting 4 weeks of accommodation"],
        ["From 3 days before departure", "Remaining amount after deducting 4 weeks of tuition and accommodation"],
      ],
      afterTitle: "After the Course Starts",
      afterRows: [
        ["Within 25% of the total period", "70% of the refundable balance"],
        ["Within 50% of the total period", "50% of the refundable balance"],
        ["Within 75% of the total period", "30% of the refundable balance"],
        ["More than 75% of the total period", "No refund"],
      ],
      notesTitle: "Important Notes",
      notes: [
        "Refunds are calculated in four-week units; remaining periods of less than four weeks may be excluded from the refund calculation.",
        "Unpaid outstanding balances are not refundable.",
        "After a refund request is submitted, SYA will verify the applicable rule and confirm the final refundable amount.",
        "For unavoidable circumstances such as illness, separate consultation may be required depending on supporting documents.",
        "Refunds may be restricted in cases such as dismissal for violation of academy rules.",
      ],
    },
    trustBar: {
      heading: "SYA Academy's Official Accreditation & Certifications",
      items: [
        "Officially Accredited Institution by Philippine TESDA (Reg. No. 2018-09-0448)",
        "Authorized SSP (Special Study Permit) Issuing Body under Philippine Immigration (AAFS No. RAD-2019-031)",
        "Full Member of the Korea Study Abroad Association & 24-Hour On-Site Safety Guardian System",
      ],
    },
  },
};

// RTL(ar) 페이지에서 영문 폴백 문구(마침표·괄호·"→" 등)가 뒤섞이지 않도록 격리한 사본
const UI_EN_RTL = isolateLtrDeep(UI.en);

export default function ServicesContent({ lang, dict }: ServicesContentProps) {
  const ko = lang === "ko";
  const t = ko ? UI.ko : isRtlLocale(lang) ? UI_EN_RTL : UI.en;
  const searchParams = useSearchParams();
  const { openConsultation } = useConsultationModal();

  // 헤더 드롭다운 등에서 ?tab=dormitory 같은 쿼리로 들어오면 해당 섹션을 연다.
  // (URL이 바뀌면 렌더 중에 한 번 맞춰 주는 방식 — useEffect 동기화 불필요)
  const tabParam = searchParams.get("tab");
  const [activeSection, setActiveSection] = useState<SectionId>(isSectionId(tabParam) ? tabParam : "tuition");
  const [syncedTab, setSyncedTab] = useState(tabParam);
  if (tabParam !== syncedTab) {
    setSyncedTab(tabParam);
    if (isSectionId(tabParam)) setActiveSection(tabParam);
  }

  function goToAdmission() {
    openConsultation();
  }

  const sidebarItems: { id: SectionId; icon: ReactNode }[] = [
    { id: "tuition", icon: <IconDoc /> },
    { id: "dormitory", icon: <IconHome /> },
    { id: "localExpenses", icon: <IconCoin /> },
    { id: "refundPolicy", icon: <IconDoc /> },
    { id: "calculator", icon: <IconCalculator /> },
  ];

  return (
    <main className="bg-sya-soft">
      <section className="bg-gradient-to-br from-sya-navy via-sya-navy to-sya-navy px-5 py-7 sm:px-8 sm:py-9">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sya-gold/20 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.16em] text-sya-gold">
              <span aria-hidden="true">🎓</span>
              {t.pageBadge}
            </span>
            <h1 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">{t.pageTitle}</h1>
            <p className="mt-1.5 max-w-xl text-sm text-white/60 sm:text-base">{t.pageSubtitle}</p>
          </div>
          <p className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/50 sm:text-xs">
            HOME <span className="mx-1">›</span> {t.pageTitle}
            <span className="mx-1">›</span>
            <span className="font-bold text-sya-gold">{t.sidebar[activeSection].title}</span>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pb-16 sm:pt-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr] lg:items-start lg:gap-8">
          {/* 좌측 사이드바 */}
          <nav aria-label="Services sub navigation" className="lg:sticky lg:top-24">
            <ul className="space-y-2">
              {sidebarItems.map(({ id, icon }) => {
                const active = activeSection === id;
                const meta = t.sidebar[id];
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setActiveSection(id as SectionId)}
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
                        <span className={`block text-[13px] font-bold leading-snug ${active ? "text-white" : "text-sya-ink"}`}>{meta.title}</span>
                        <span className={`block truncate text-[10px] font-medium ${active ? "text-white/70" : "text-sya-ink/45"}`}>{meta.caption}</span>
                      </span>
                      <span className={active ? "text-white/70" : "text-sya-ink/25"}><IconChevron /></span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <ConsultSidebarCard lang={lang} />
          </nav>

          {/* 우측 콘텐츠 */}
          <div>
            {/* 상단 브레드크럼 + 타이틀 + 버튼 */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-sya-ink/45">
                  {activeSection === "tuition"
                    ? t.tuition.breadcrumb
                    : activeSection === "dormitory"
                    ? t.dormitory.breadcrumb
                    : activeSection === "calculator"
                    ? t.calculator.breadcrumb
                    : activeSection === "refundPolicy"
                    ? t.refundPolicy.breadcrumb
                    : t.localExpenses.breadcrumb}
                  <span className="mx-1">›</span>
                  <span className="font-semibold text-sya-navy">
                    {t.sidebar[activeSection].caption.toUpperCase()}
                  </span>
                </p>
                <h2 className="mt-1 text-2xl font-extrabold text-sya-navy sm:text-3xl">
                  {activeSection === "tuition"
                    ? t.tuition.title
                    : activeSection === "dormitory"
                    ? t.dormitory.title
                    : activeSection === "calculator"
                    ? t.calculator.title
                    : activeSection === "refundPolicy"
                    ? t.refundPolicy.title
                    : dict.localFees.title}
                </h2>
                <p className="mt-1 text-sm text-sya-ink/55">
                  {activeSection === "tuition"
                    ? t.tuition.subtitle
                    : activeSection === "dormitory"
                    ? t.dormitory.subtitle
                    : activeSection === "calculator"
                    ? t.calculator.subtitle
                    : activeSection === "refundPolicy"
                    ? t.refundPolicy.subtitle
                    : dict.localFees.subtitle}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => goToAdmission()} className="rounded-full border border-sya-navy/15 bg-white px-4 py-2 text-xs font-semibold text-sya-navy transition-colors hover:bg-sya-navy/5">
                  💬 {t.consultButton}
                </button>
                <button type="button" onClick={() => setActiveSection("calculator")} className="rounded-full border border-sya-gold/40 bg-sya-gold/10 px-4 py-2 text-xs font-semibold text-sya-gold-deep transition-colors hover:bg-sya-gold/20">
                  📊 {t.quoteButton}
                </button>
              </div>
            </div>

            {/* ============================== 1. 코스별 학비 ============================== */}
            {activeSection === "tuition" && (
              <div className="mt-6 rounded-2xl border border-sya-ink/8 bg-white p-5 shadow-sm shadow-sya-navy/5 sm:p-8">
                <TuitionSection
                  dict={dict}
                  variant="embedded"
                  onCalculatorClick={() => setActiveSection("calculator")}
                />
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveSection("localExpenses")}
                    className="text-xs font-bold text-sya-navy underline underline-offset-2"
                  >
                    {t.dormitory.localLink}
                  </button>
                </div>
              </div>
            )}

            {/* ============================== 2. 숙소 안내 (BE Pods 우선 / Noble 추가) ============================== */}
            {activeSection === "dormitory" && (
              <div className="mt-6 space-y-5">
                {/* Main Accommodation: BE Pods Lahug (메인 Accommodation 섹션과 같은 사진·문구 재사용) */}
                <section
                  aria-labelledby="dorm-main-heading"
                  className="overflow-hidden rounded-2xl border border-sya-ink/8 bg-white shadow-sm shadow-sya-navy/5"
                >
                  <div className="grid lg:grid-cols-12">
                    <div className="relative aspect-[4/3] bg-sya-soft lg:col-span-7 lg:aspect-auto lg:min-h-[360px]">
                      <Image
                        src="/images/be-pods/lobby-lounge-web.jpg"
                        alt={dict.accommodation.lobby.alt}
                        fill
                        sizes="(min-width: 1024px) 560px, 100vw"
                        className="object-cover object-[45%_center]"
                      />
                    </div>
                    <div className="flex flex-col p-6 sm:p-8 lg:col-span-5">
                      <p lang="en" className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-sya-gold-deep">
                        <span aria-hidden="true" className="h-px w-8 bg-sya-gold/70" />
                        {dict.accommodation.eyebrow}
                      </p>
                      <h3 id="dorm-main-heading" className="mt-5 text-3xl font-bold tracking-tight text-sya-navy">
                        {dict.accommodation.title}
                      </h3>
                      <p lang="en" className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sya-navy/50">
                        Main Accommodation
                      </p>
                      <p className="mt-5 break-keep text-lg font-light leading-snug text-sya-navy/80 lg:whitespace-pre-line">
                        {dict.accommodation.subtitle}
                      </p>
                      <dl className="mt-6 border-t border-sya-ink/8 pt-5">
                        <dt className="text-[11px] font-semibold text-sya-gold-deep">{t.dormitory.costLabel}</dt>
                        <dd className="mt-1 text-base font-semibold text-sya-navy">{dict.tuition.onRequest}</dd>
                        <dd className="mt-1 break-keep text-xs text-sya-ink/55">{t.dormitory.costNote}</dd>
                      </dl>
                      <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row sm:items-center">
                        <button
                          type="button"
                          onClick={() => openConsultation(undefined, { stay: "included" })}
                          className="rounded-full bg-sya-navy px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-sya-ink"
                        >
                          {t.dormitory.consultBtn}
                        </button>
                        <Link
                          href={`/${lang}#accommodation`}
                          className="text-xs font-bold text-sya-navy underline underline-offset-2"
                        >
                          {t.dormitory.exploreLink}
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Additional Accommodation: Noble Hotel (간결하게, 사진·가격·시설 정보 없음) */}
                <section
                  aria-labelledby="dorm-additional-heading"
                  className="rounded-2xl border border-sya-ink/8 bg-white p-6 sm:p-8"
                >
                  <p lang="en" className="text-[10px] font-semibold uppercase tracking-[0.26em] text-sya-ink/45">
                    {dict.accommodation.additional.eyebrow}
                  </p>
                  <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 id="dorm-additional-heading" className="text-xl font-bold text-sya-navy">
                        {dict.accommodation.additional.name}
                      </h3>
                      <p lang="en" className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sya-navy/45">
                        Additional Accommodation
                      </p>
                      <p className="mt-3 break-keep text-sm text-sya-ink/60">{dict.accommodation.additional.description}</p>
                    </div>
                    <dl className="shrink-0 sm:text-end">
                      <dt className="text-[11px] font-semibold text-sya-gold-deep">{t.dormitory.costLabel}</dt>
                      <dd className="mt-1 text-sm font-semibold text-sya-navy">{dict.tuition.onRequest}</dd>
                    </dl>
                  </div>
                </section>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sya-ink/8 bg-white p-4">
                  <p className="flex items-center gap-2 text-xs text-sya-ink/60"><IconInfo />{t.dormitory.bottomNote}</p>
                  <button type="button" onClick={() => setActiveSection("localExpenses")} className="shrink-0 text-xs font-bold text-sya-navy underline underline-offset-2">
                    {t.dormitory.localLink}
                  </button>
                </div>
              </div>
            )}

            {/* ============================== 3. 실시간 견적 계산기 ============================== */}
            {activeSection === "calculator" && (
              <div className="mt-6 rounded-2xl border border-sya-ink/8 bg-white p-5 shadow-sm shadow-sya-navy/5 sm:p-6">
                <CostCalculator lang={lang} dict={dict} />
              </div>
            )}

            {/* ============================== 4. 현지 납부비용 (금액: config/localFees.ts, 문구: dict.localFees) ============================== */}
            {activeSection === "localExpenses" && (
              <div className="mt-6 rounded-2xl border border-sya-ink/8 bg-white p-5 shadow-sm shadow-sya-navy/5 sm:p-6">
                <h3 className="text-lg font-bold text-sya-navy">{dict.localFees.heading}</h3>
                <p className="mt-2 text-sm leading-relaxed text-sya-ink/65">{dict.localFees.description}</p>
                <div className="mt-5 overflow-x-auto rounded-xl border border-sya-ink/8">
                  <table className="w-full min-w-[560px] border-collapse text-left text-xs rtl:text-right">
                    <thead>
                      <tr className="bg-sya-navy text-white">
                        <th scope="col" className="px-3 py-2.5 font-semibold">{dict.localFees.columns.item}</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">{dict.localFees.columns.amount}</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">{dict.localFees.columns.note}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {LOCAL_FEE_IDS.map((id, i) => {
                        const item = dict.localFees.items[id];
                        const amount = LOCAL_FEES[id].amountPhp;
                        return (
                          <tr key={id} className={i % 2 === 0 ? "bg-white" : "bg-sya-navy/[0.03]"}>
                            <td className="px-3 py-2.5 font-bold text-sya-navy">{item.name}</td>
                            <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-sya-ink">
                              {amount !== null ? `${amount.toLocaleString("en-US")} PHP` : dict.localFees.onRequest}
                            </td>
                            <td className="px-3 py-2.5 text-sya-ink/55">{item.note}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="flex items-center gap-2 text-sm font-bold text-blue-800"><IconInfo />{dict.localFees.depositBox.title}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-blue-900/70">{dict.localFees.depositBox.description}</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-4">
                    <p className="flex items-center gap-2 text-sm font-bold text-amber-800"><IconInfo />{dict.localFees.paymentBox.title}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-amber-900/70">{dict.localFees.paymentBox.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ============================== 5. SYA 환불 규정 ============================== */}
            {activeSection === "refundPolicy" && (
              <div className="mt-6 space-y-5">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
                  <p className="text-sm font-bold text-amber-900">{t.refundPolicy.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-amber-950/75">{t.refundPolicy.intro}</p>
                  <p className="mt-3 rounded-xl border border-amber-200 bg-white/70 p-4 text-xs font-semibold leading-5 text-amber-900">{t.refundPolicy.basis}</p>
                </div>

                <section className="rounded-2xl border border-sya-ink/8 bg-white p-5 shadow-sm shadow-sya-navy/5 sm:p-6">
                  <h3 className="text-lg font-bold text-sya-navy">{t.refundPolicy.beforeTitle}</h3>
                  <div className="mt-4 overflow-x-auto rounded-xl border border-sya-ink/8">
                    <table className="w-full min-w-[620px] border-collapse text-sm">
                      <thead>
                        <tr className="bg-sya-navy text-white">
                          <th className="px-4 py-3 text-left font-semibold">{lang === "ko" ? "신청 시점" : "Request timing"}</th>
                          <th className="px-4 py-3 text-left font-semibold">{lang === "ko" ? "환불 기준" : "Refund basis"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.refundPolicy.beforeRows.map(([when, rule]: string[], i: number) => (
                          <tr key={when} className={i % 2 === 0 ? "bg-white" : "bg-sya-navy/[0.03]"}>
                            <td className="px-4 py-3 font-semibold text-sya-navy">{when}</td>
                            <td className="px-4 py-3 text-sya-ink/70">{rule}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-2xl border border-sya-ink/8 bg-white p-5 shadow-sm shadow-sya-navy/5 sm:p-6">
                  <h3 className="text-lg font-bold text-sya-navy">{t.refundPolicy.afterTitle}</h3>
                  <div className="mt-4 overflow-x-auto rounded-xl border border-sya-ink/8">
                    <table className="w-full min-w-[620px] border-collapse text-sm">
                      <thead>
                        <tr className="bg-sya-navy text-white">
                          <th className="px-4 py-3 text-left font-semibold">{lang === "ko" ? "수강 진행률" : "Course progress"}</th>
                          <th className="px-4 py-3 text-left font-semibold">{lang === "ko" ? "환불 기준" : "Refund basis"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.refundPolicy.afterRows.map(([when, rule]: string[], i: number) => (
                          <tr key={when} className={i % 2 === 0 ? "bg-white" : "bg-sya-navy/[0.03]"}>
                            <td className="px-4 py-3 font-semibold text-sya-navy">{when}</td>
                            <td className="px-4 py-3 text-sya-ink/70">{rule}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-2xl border border-sya-ink/8 bg-white p-5 shadow-sm shadow-sya-navy/5 sm:p-6">
                  <h3 className="text-lg font-bold text-sya-navy">{t.refundPolicy.notesTitle}</h3>
                  <ul className="mt-4 space-y-2 text-sm leading-relaxed text-sya-ink/70">
                    {t.refundPolicy.notes.map((note: string) => (
                      <li key={note} className="flex items-start gap-2">
                        <span className="mt-1 text-sya-gold-deep"><IconCheck /></span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            )}

            {/* 공인 인증 내역 트러스트 바 */}
            <div className="mt-8 rounded-2xl bg-sya-navy p-6">
              <p className="flex items-center gap-2 text-sm font-bold text-sya-gold">
                <IconCheck />{t.trustBar.heading}
              </p>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {t.trustBar.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-white/70">
                    <span className="mt-0.5 text-emerald-400"><IconCheck /></span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
