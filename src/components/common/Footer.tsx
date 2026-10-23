"use client";

import Link from "next/link";
import type { Locale } from "@/config/i18n";
import { useConsultationModal } from "@/components/common/ConsultationModalProvider";

interface FooterProps {
  lang: Locale;
}

// 푸터는 아직 7개 언어 사전에 포함되어 있지 않아 한국어 고정 텍스트를 사용합니다.
// (다국어로 확장하려면 dictionaries/*.json에 footer 키를 추가하고 여기서 dict.footer로 교체하면 됩니다.)
const ACCREDITATIONS = [
  "필리핀 교육부 TESDA 정식 인가 교육기관 (TESDA Reg. No. 2018-09-0448)",
  "필리핀 이민국 SSP(Special Study Permit) 공인 인증 발급처 (AAFS No. RAD-2019-031)",
  "한국 유학협회 정회원 & 24시간 안전 가디언 상주 시스템",
];

const QUICK_LINKS: { label: string; href: string }[] = [
  { label: "학원 소개 & 비전", href: "about" },
  { label: "정규 커리큘럼 안내", href: "programs" },
  { label: "학비 & 기숙사 견적", href: "services" },
  { label: "식단정보 · 1일 3식 뷔페", href: "campus?tab=meals" },
  { label: "세부 주말투어 & 액티비티", href: "campus?tab=activities" },
  { label: "필리핀 비자/생활 가이드", href: "campus?tab=visa" },
  { label: "연수후기 & 공지사항", href: "community?tab=notices" },
];

const POLICY_LINKS = [
  { label: "이용약관 (Terms)", href: "#" },
  { label: "개인정보처리방침 (Privacy Policy)", href: "#" },
  { label: "환불 규정 (Refund Policy)", href: "services?tab=refundPolicy" },
];

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCheckCircle() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 10.5l2.5 2.5L14 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconChevronSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-0.5 shrink-0">
      <path d="M12 22s7-6.6 7-12a7 7 0 1 0-14 0c0 5.4 7 12 7 12Z" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.5 21 3 13.5 3 4.7c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M4 5h16v14H4V5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 6l8 7 8-7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4C7 4 3 7.4 3 11.5c0 2.5 1.5 4.7 3.8 6.1-.2.9-.7 2.3-1.3 3.2 1.5-.2 3.3-.9 4.4-1.6.7.1 1.4.2 2.1.2 5 0 9-3.4 9-7.5S17 4 12 4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export default function Footer({ lang }: FooterProps) {
  const { openConsultation } = useConsultationModal();

  return (
    <footer className="bg-sya-navy text-slate-400 text-xs border-t border-white/10">
      {/* 공인 인증 및 공식 인가 내역 */}
      <div className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <p className="flex items-center gap-2 text-[13px] font-bold text-white">
            <IconShield />
            SYA 어학원 공인 인증 및 공식 인가 내역
          </p>
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
            {ACCREDITATIONS.map((item, i) => (
              <span key={i} className="flex items-center gap-1.5 text-slate-300">
                <span className="text-sky-400">
                  <IconCheckCircle />
                </span>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 정보 4단 */}
      <div className="px-6 pt-12 pb-8">
        <div className="mx-auto max-w-7xl grid gap-8 sm:grid-cols-12">
          {/* 로고 + 소개 + 주소 */}
          <div className="sm:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-lg text-white">
                🎓
              </span>
              <div>
                <p className="text-base font-black tracking-wide text-white">SYA Academy</p>
                <p className="text-[11px] font-medium text-slate-500">Special Your Academy</p>
              </div>
            </div>
            <p className="leading-relaxed font-medium max-w-md text-slate-400">
              필리핀 세부에 위치한 SYA 어학원은 스피킹과 회화 중심의 실전 영어교육으로, 하루 최대 4시간의 1:1 맨투맨 수업을 중심으로, 학습과 생활이 자연스럽게 이어지는 하루 약 8시간의 영어 프로그램을 통해
              어린이부터 성인까지 실제로 영어를 사용하는 힘을 키웁니다.
            </p>
            <div className="space-y-2">
              <p className="flex items-start gap-2">
                <span className="text-slate-500">
                  <IconPin />
                </span>
                <span>
                  <strong className="font-bold text-slate-200">필리핀 캠퍼스:</strong>{" "}
                  SYA Campus, A.S. Fortuna St, Banilad, Mandaue City, Cebu, Philippines
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-slate-500">
                  <IconPin />
                </span>
                <span>
                  <strong className="font-bold text-slate-200">한국 등록 사무소:</strong>{" "}
                  서울특별시 서초구 강남대로 381 두산베어스텔 1204호
                </span>
              </p>
            </div>
          </div>

          {/* 주요 바로가기 (데스크톱: 칸의 오른쪽 끝에 붙여 '상담 및 입학처'와의 간격을 다른 컬럼 간격과 동일하게) */}
          <div className="sm:col-span-3 space-y-3 lg:justify-self-end">
            <h4 className="text-white font-bold tracking-wide uppercase text-[11px] mb-2">
              주요 바로가기
            </h4>
            <ul className="space-y-2 font-semibold">
              {QUICK_LINKS.map((link, i) => (
                <li key={i}>
                  <Link
                    href={`/${lang}/${link.href}`}
                    className="flex items-center gap-1.5 hover:text-white transition-colors"
                  >
                    <IconChevronSmall />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 상담 및 입학처 */}
          <div className="sm:col-span-2 space-y-3">
            <h4 className="text-white font-bold tracking-wide uppercase text-[11px] mb-2">
              상담 및 입학처
            </h4>
            <a href="tel:0225887104" className="flex items-center gap-2 font-bold text-white hover:text-sky-300">
              <IconPhone /> 02-588-7104
            </a>
            <p className="flex items-center gap-2 text-slate-300">
              <IconPhone /> 현지 직통: +63-32-416-1227
            </p>
            <a
              href="mailto:admissions@sya-academy.com"
              className="flex items-center gap-2 text-slate-300 hover:text-white"
            >
              <IconMail /> admissions@sya-academy.com
            </a>
            <p className="flex items-center gap-2 text-slate-300">
              <IconClock /> 평일 09:00 - 18:00
            </p>
            <button
              type="button"
              onClick={() => openConsultation()}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-sky-600 px-4 py-2.5 text-[11px] font-bold text-white transition-colors hover:bg-sky-500"
            >
              <IconChat /> 1:1 맞춤 견적 신청하기
            </button>
          </div>

          {/* 학사 관리 포털 */}
          <div className="sm:col-span-2 space-y-3">
            <h4 className="text-white font-bold tracking-wide uppercase text-[11px] mb-2">
              학사 관리 포털
            </h4>
            <p className="leading-relaxed text-slate-400">
              SYA 어학원 교직원 전용 상담 접수 및 재원생 출결 관리 시스템입니다.
            </p>
            {/*
              관리자 대시보드(/admin)로 이동합니다.
              - 로그인하지 않았으면 기존 proxy.ts·관리자 레이아웃이 /admin/login 으로 보냅니다.
              - 언어 경로(/ko 등)와 관계없는 관리자 경로라 next/link 대신 일반 <a>로 전체 페이지를 이동합니다.
              - Netlify Drop 정적 사이트에는 관리자 화면·API가 포함되지 않으므로 그곳에서는 동작하지 않습니다.
            */}
            <a
              href="/admin"
              className="flex w-full items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-[11px] font-bold text-slate-200 transition-colors hover:bg-white/15"
            >
              <IconLock /> 관리자 포털 접속
            </a>
            <p className="text-[10px] leading-relaxed text-slate-500">
              * 출결 80% 미만 이민국 규정 모니터링 포함
            </p>
          </div>
        </div>

        {/* 최하단 카피라이트 + 정책 링크 */}
        <div className="mx-auto max-w-7xl border-t border-white/10 mt-10 pt-6 flex flex-col gap-3 text-[10px] text-slate-500 font-medium sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 SYA (Special Your Academy). All Rights Reserved.</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {POLICY_LINKS.map((policy, i) => (
              <a key={i} href={policy.href} className="hover:text-white transition-colors">
                {policy.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
