"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { locales, localeMeta, type Locale } from "@/config/i18n";
import type { Dictionary } from "@/types/dictionary";
import { useConsultationModal } from "@/components/common/ConsultationModalProvider";

interface HeaderProps {
  lang: Locale;
  dict: Dictionary;
}

/**
 * 현재 pathname의 최상단 로케일 세그먼트만 교체하고 나머지 경로는 유지한다.
 * 예) /ko/programs/detail/3 -> /en/programs/detail/3
 */
function replaceLocaleInPath(pathname: string, nextLocale: Locale): string {
  const segments = pathname.split("/");
  // segments[0] === "" (leading slash), segments[1] === 현재 로케일
  if (segments.length > 1) {
    segments[1] = nextLocale;
  } else {
    return `/${nextLocale}`;
  }
  return segments.join("/") || `/${nextLocale}`;
}

/* ------------------------------------------------------------------ */
/* 드롭다운 서브메뉴 항목                                                  */
/* 각 페이지 컴포넌트가 ?tab=<id> 쿼리를 읽어 해당 탭/섹션/코스를 바로 연다.    */
/* 라벨은 ko/en 두 버전만 관리하고(다른 6개 언어는 en 폴백),                   */
/* 각 페이지 컴포넌트 자체의 sidebarTitle·caption과 동일한 문구를 사용한다.     */
/* ------------------------------------------------------------------ */
interface DropdownItem {
  tab: string;
  ko: string;
  en: string;
  /** 드롭다운 안에서 소제목으로 묶을 그룹 (지정 시 그룹이 바뀌는 지점에 소제목 표시) */
  group?: DropdownGroup;
}

type DropdownGroup = "regular" | "camp";

/** 교육과정 드롭다운의 그룹 소제목 (정규반 / 캠프반) */
const DROPDOWN_GROUP_LABELS: Record<DropdownGroup, { ko: string; en: string }> = {
  regular: { ko: "정규반", en: "Regular Programs" },
  camp: { ko: "캠프반", en: "Camp Programs" },
};

const DROPDOWN_ITEMS: Record<string, DropdownItem[]> = {
  about: [
    { tab: "overview", ko: "학원소개", en: "About SYA" },
    { tab: "director", ko: "원장 인사말", en: "Director's Message" },
    { tab: "faculty", ko: "전문 강사진", en: "Faculty System" },
    { tab: "facility", ko: "캠퍼스 시설 & 안전", en: "Campus & Facilities" },
    { tab: "location", ko: "오시는 길", en: "Location & Map" },
  ],
  programs: [
    // 정규반
    { tab: "intensiveEsl", ko: "인텐시브 ESL", en: "Intensive ESL", group: "regular" },
    { tab: "business", ko: "비즈니스 실무 영어", en: "Business English", group: "regular" },
    { tab: "studyAbroad", ko: "유학 준비", en: "Study Abroad Prep", group: "regular" },
    // 캠프반
    { tab: "summerWinterCamp", ko: "여름/겨울 방학캠프", en: "Summer/Winter Vacation Camp", group: "camp" },
    { tab: "familyCamp", ko: "상시 가족캠프", en: "Year-round Family Camp", group: "camp" },
  ],
  services: [
    { tab: "tuition", ko: "코스별 정규 학비표", en: "Tuition Table" },
    { tab: "dormitory", ko: "기숙사 타입별 안내", en: "Dormitory Rooms" },
    { tab: "localExpenses", ko: "현지 납부비용 안내 (SSP·비자 등)", en: "Local Expenses" },
    { tab: "refundPolicy", ko: "환불 규정", en: "Refund Policy" },
  ],
  campus: [
    { tab: "meals", ko: "식단정보 (1일 3식 뷔페)", en: "Weekly Meal Plan" },
    { tab: "activities", ko: "액티비티 (세부 주말투어)", en: "Weekend Activities" },
    { tab: "visa", ko: "비자 & SSP 발급 안내", en: "Visa & SSP Info" },
    { tab: "pickup", ko: "공항 안심 픽업 가이드", en: "Airport Pick-up" },
    { tab: "localLife", ko: "현지 생활 및 물가 정보", en: "Local Life & Cost" },
    { tab: "packing", ko: "출국 필수 준비물 리스트", en: "Packing Checklist" },
  ],
  community: [
    { tab: "notices", ko: "학원 공지사항", en: "Notices" },
    { tab: "reviews", ko: "생생 연수후기", en: "Student Reviews" },
    { tab: "gallery", ko: "학원 갤러리", en: "Campus Gallery" },
    { tab: "qna", ko: "질문과 답변 (Q&A)", en: "Q&A Board" },
    { tab: "faq", ko: "자주 묻는 질문 (FAQ)", en: "FAQ" },
  ],
};

// services 드롭다운 맨 아래에 별도로 붙는 계산기 바로가기 (탭이 아니라 홈 페이지 앵커라 별도 처리)
const CALCULATOR_SHORTCUT = { ko: "실시간 학비 계산기", en: "Live Cost Calculator" };

function IconChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Header({ lang, dict }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { openConsultation } = useConsultationModal();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navItems: { key: keyof Dictionary["nav"]; href: string }[] = [
    { key: "about", href: "about" },
    { key: "programs", href: "programs" },
    { key: "services", href: "services" },
    { key: "campus", href: "campus" },
    { key: "community", href: "community" },
  ];

  /** 현재 주소(pathname)가 이 메뉴의 경로(/{lang}/{href})와 일치하는지 판별 */
  function isActiveMenu(href: string): boolean {
    return pathname === `/${lang}/${href}`;
  }

  function handleMenuEnter(href: string) {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpenDropdown(href);
  }
  function handleMenuLeave() {
    closeTimerRef.current = setTimeout(() => setOpenDropdown(null), 120);
  }

  // 드롭다운 바깥 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ESC 키로 닫기 (접근성)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsLangOpen(false);
        setOpenDropdown(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleLocaleSwitch(nextLocale: Locale) {
    if (nextLocale === lang) {
      setIsLangOpen(false);
      return;
    }
    const nextPath = replaceLocaleInPath(pathname ?? `/${lang}`, nextLocale);
    setIsLangOpen(false);
    router.push(nextPath);
  }

  // 현재 언어가 최상단에 오도록 정렬
  const orderedLocales: Locale[] = [
    lang,
    ...locales.filter((l) => l !== lang),
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-sya-ink/8 bg-sya-soft/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        {/* 로고 영역 */}
        <Link
          href={`/${lang}`}
          className="group flex items-center gap-3"
          aria-label="SYA - Special Your Academy Home"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/sya-logo-icon.png"
              alt="SYA"
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </span>
          <span className="flex flex-col">
            <span className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-sya-navy">
                SYA
              </span>
              <span className="rounded-md bg-sya-navy/[0.06] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-sya-navy/70">
                CEBU
              </span>
            </span>
            <span className="hidden text-[11px] font-medium text-sya-navy/45 sm:inline">
              Special Your Academy
            </span>
          </span>
        </Link>

        {/* 데스크톱 GNB */}
        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => {
            const active = isActiveMenu(item.href);
            const dropdownItems = DROPDOWN_ITEMS[item.href];
            const isOpen = openDropdown === item.href;
            return (
              <div
                key={item.key}
                className="relative"
                onMouseEnter={() => handleMenuEnter(item.href)}
                onMouseLeave={handleMenuLeave}
              >
                <Link
                  href={`/${lang}/${item.href}`}
                  aria-current={active ? "page" : undefined}
                  aria-haspopup={dropdownItems ? "true" : undefined}
                  aria-expanded={dropdownItems ? isOpen : undefined}
                  className={`relative flex items-center gap-1 py-1 text-[15px] font-medium transition-colors after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-blue-600 after:transition-opacity after:content-[''] ${
                    active
                      ? "text-blue-600 font-semibold after:opacity-100"
                      : "text-sya-ink/75 after:opacity-0 hover:text-sya-navy"
                  }`}
                >
                  {dict.nav[item.key]}
                  {dropdownItems && <IconChevronDown open={isOpen} />}
                </Link>

                {dropdownItems && (
                  <div
                    className={`absolute start-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-sya-ink/8 bg-white py-2 shadow-lg shadow-sya-navy/10 transition-all duration-150 ease-out ${
                      isOpen
                        ? "translate-y-0 opacity-100"
                        : "pointer-events-none -translate-y-1 opacity-0"
                    }`}
                  >
                    {dropdownItems.map((sub, index) => {
                      const groupStart =
                        sub.group && sub.group !== dropdownItems[index - 1]?.group ? sub.group : null;
                      return (
                        <Fragment key={sub.tab}>
                          {groupStart && (
                            <p
                              className={`px-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sya-gold-deep ${
                                index > 0 ? "mt-1.5 border-t border-sya-ink/8 pt-3" : "pt-1.5"
                              }`}
                            >
                              {lang === "ko"
                                ? DROPDOWN_GROUP_LABELS[groupStart].ko
                                : DROPDOWN_GROUP_LABELS[groupStart].en}
                            </p>
                          )}
                          <Link
                            href={`/${lang}/${item.href}?tab=${sub.tab}`}
                            onClick={() => setOpenDropdown(null)}
                            className="block px-4 py-2.5 text-sm font-medium text-sya-ink/75 transition-colors hover:bg-sya-navy/[0.05] hover:text-sya-navy"
                          >
                            {lang === "ko" ? sub.ko : sub.en}
                          </Link>
                        </Fragment>
                      );
                    })}
                    {item.href === "services" && (
                      <Link
                        href={`/${lang}/services?tab=calculator`}
                        onClick={() => setOpenDropdown(null)}
                        className="mt-1 flex items-center gap-1.5 border-t border-sya-ink/8 px-4 pt-2.5 pb-1 text-sm font-semibold text-sya-gold-deep transition-colors hover:bg-amber-50"
                      >
                        <span aria-hidden="true">✨</span>
                        {lang === "ko" ? CALCULATOR_SHORTCUT.ko : CALCULATOR_SHORTCUT.en}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* 온라인 상담신청 버튼 (입학안내 메뉴를 대체) */}
          <button
            type="button"
            onClick={() => openConsultation()}
            className="hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-[13px] font-bold text-white shadow-sm transition-colors hover:from-sky-600 hover:to-blue-700 sm:flex"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 4C7 4 3 7.4 3 11.5c0 2.5 1.5 4.7 3.8 6.1-.2.9-.7 2.3-1.3 3.2 1.5-.2 3.3-.9 4.4-1.6.7.1 1.4.2 2.1.2 5 0 9-3.4 9-7.5S17 4 12 4Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            {dict.hero.ctaConsult}
          </button>

          {/* 언어 선택 드롭다운 */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsLangOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={isLangOpen}
              aria-label={dict.langSwitcher.label}
              className="flex items-center gap-1.5 rounded-full border border-sya-navy/12 bg-white/60 px-3.5 py-1.5 text-sm font-medium text-sya-ink transition-colors hover:border-sya-navy/25 hover:bg-white"
            >
              <span>{localeMeta[lang].label}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className={`transition-transform duration-200 ${
                  isLangOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              >
                <path
                  d="M2.5 4.5L6 8L9.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* 드롭다운 패널: 현재 언어가 최상단 */}
            <div
              role="listbox"
              aria-label={dict.langSwitcher.label}
              className={`absolute end-0 top-full mt-2 w-44 origin-top-right rtl:origin-top-left overflow-hidden rounded-xl border border-sya-ink/8 bg-white shadow-lg shadow-sya-navy/10 transition-all duration-200 ease-out ${
                isLangOpen
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-1 opacity-0"
              }`}
            >
              <ul className="max-h-80 overflow-y-auto py-1">
                {orderedLocales.map((localeCode) => {
                  const isActive = localeCode === lang;
                  return (
                    <li key={localeCode}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => handleLocaleSwitch(localeCode)}
                        className={`flex w-full items-center justify-between px-4 py-2.5 text-start text-sm transition-colors ${
                          isActive
                            ? "bg-sya-navy/[0.06] font-semibold text-sya-navy"
                            : "font-medium text-sya-ink/70 hover:bg-sya-ink/[0.04] hover:text-sya-ink"
                        }`}
                      >
                        <span>{localeMeta[localeCode].label}</span>
                        {isActive && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M2.5 7.5L5.5 10.5L11.5 3.5"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* 모바일 메뉴 토글 */}
          <button
            type="button"
            onClick={() => setIsMobileNavOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileNavOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-sya-navy/12 text-sya-navy lg:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              {isMobileNavOpen ? (
                <path
                  d="M3 3L13 13M13 3L3 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M2 4H14M2 8H14M2 12H14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* 모바일 GNB */}
      <div
        className={`overflow-hidden border-t border-sya-ink/8 bg-sya-soft/95 backdrop-blur-md transition-[max-height] duration-300 ease-out lg:hidden ${
          isMobileNavOpen ? "max-h-[32rem] overflow-y-auto" : "max-h-0 border-t-0"
        }`}
      >
        <nav className="flex flex-col px-5 py-2">
          {navItems.map((item) => {
            const active = isActiveMenu(item.href);
            const dropdownItems = DROPDOWN_ITEMS[item.href];
            const expanded = mobileExpanded === item.href;
            return (
              <div key={item.key} className="border-b border-sya-ink/6 last:border-b-0">
                <div className="flex items-center">
                  <Link
                    href={`/${lang}/${item.href}`}
                    onClick={() => setIsMobileNavOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex-1 py-3 ps-3 text-[15px] font-medium transition-colors ${
                      active
                        ? "border-s-2 border-s-blue-600 font-semibold text-blue-600"
                        : "border-s-2 border-s-transparent text-sya-ink/80"
                    }`}
                  >
                    {dict.nav[item.key]}
                  </Link>
                  {dropdownItems && (
                    <button
                      type="button"
                      onClick={() => setMobileExpanded(expanded ? null : item.href)}
                      aria-label="Toggle submenu"
                      aria-expanded={expanded}
                      className="p-3 text-sya-ink/50"
                    >
                      <IconChevronDown open={expanded} />
                    </button>
                  )}
                </div>
                {dropdownItems && expanded && (
                  <div className="pb-2 ps-6">
                    {dropdownItems.map((sub, index) => {
                      const groupStart =
                        sub.group && sub.group !== dropdownItems[index - 1]?.group ? sub.group : null;
                      return (
                        <Fragment key={sub.tab}>
                          {groupStart && (
                            <p
                              className={`pb-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sya-gold-deep ${
                                index > 0 ? "pt-3" : "pt-1"
                              }`}
                            >
                              {lang === "ko"
                                ? DROPDOWN_GROUP_LABELS[groupStart].ko
                                : DROPDOWN_GROUP_LABELS[groupStart].en}
                            </p>
                          )}
                          <Link
                            href={`/${lang}/${item.href}?tab=${sub.tab}`}
                            onClick={() => {
                              setIsMobileNavOpen(false);
                              setMobileExpanded(null);
                            }}
                            className="block py-2 text-sm text-sya-ink/65"
                          >
                            {lang === "ko" ? sub.ko : sub.en}
                          </Link>
                        </Fragment>
                      );
                    })}
                    {item.href === "services" && (
                      <Link
                        href={`/${lang}/services?tab=calculator`}
                        onClick={() => {
                          setIsMobileNavOpen(false);
                          setMobileExpanded(null);
                        }}
                        className="block py-2 text-sm font-semibold text-sya-gold-deep"
                      >
                        ✨ {lang === "ko" ? CALCULATOR_SHORTCUT.ko : CALCULATOR_SHORTCUT.en}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setIsMobileNavOpen(false);
              openConsultation();
            }}
            className="my-3 flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-bold text-white"
          >
            {dict.hero.ctaConsult}
          </button>
        </nav>
      </div>
    </header>
  );
}
