"use client";

import { isRtlLocale, type Locale } from "@/config/i18n";
import type { CampusDictionary } from "@/types/dictionary";
import { isolateLtrDeep } from "@/lib/bidi";
import { useConsultationModal } from "@/components/common/ConsultationModalProvider";
import { CONSULT_CHANNEL_URL } from "@/components/common/ConsultationModal";

interface ConsultSidebarCardProps {
  lang: Locale;
  /**
   * 페이지별 사전에서 넘겨주는 카드 문구 (예: 필리핀 생활안내 8개 언어).
   * 넘기지 않으면 기존과 동일하게 ko / en 문구를 사용한다.
   */
  copy?: CampusDictionary["consultCard"];
}

const PHONE_NUMBER_DISPLAY = "02-588-7104";
const PHONE_NUMBER_TEL = "0225887104";
const KAKAO_CHANNEL_ID = "SYA_ACADEMY";

const COPY = {
  ko: {
    badge: "Customer Center",
    title: "입학 및 연수 상담센터",
    phoneLabel: "대표 상담전화",
    kakaoLabel: "카카오톡 상담",
    ctaButton: "1:1 빠른 온라인 상담신청",
    accreditation: "필리핀 교육부 TESDA 정식 인가",
  },
  en: {
    badge: "Customer Center",
    title: "Admission & Consultation Center",
    phoneLabel: "Main Consultation Line",
    kakaoLabel: "KakaoTalk Consult",
    ctaButton: "1:1 Quick Online Consultation",
    accreditation: "Officially Accredited by Philippine TESDA",
  },
};

function IconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.5 21 3 13.5 3 4.7c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconChat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4C7 4 3 7.4 3 11.5c0 2.5 1.5 4.7 3.8 6.1-.2.9-.7 2.3-1.3 3.2 1.5-.2 3.3-.9 4.4-1.6.7.1 1.4.2 2.1.2 5 0 9-3.4 9-7.5S17 4 12 4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconBubble() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5h16v11H8l-4 4V5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// RTL(ar) 페이지에서 영문 폴백 문구가 뒤섞이지 않도록 격리한 사본
const COPY_EN_RTL = isolateLtrDeep(COPY.en);

export default function ConsultSidebarCard({ lang, copy }: ConsultSidebarCardProps) {
  const base = lang === "ko" ? COPY.ko : isRtlLocale(lang) ? COPY_EN_RTL : COPY.en;
  const t = copy ? { ...base, ...copy } : base;
  const { openConsultation } = useConsultationModal();

  return (
    <div className="mt-4 rounded-2xl border border-sya-ink/8 bg-white p-5 shadow-sm shadow-sya-navy/5">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-sya-navy/50">
        {t.badge}
      </span>
      <h3 className="mt-1.5 text-base font-extrabold text-sya-navy">{t.title}</h3>

      <a
        href={`tel:${PHONE_NUMBER_TEL}`}
        className="mt-4 flex items-center gap-3 rounded-xl bg-sya-navy/[0.04] px-3.5 py-3 transition-colors hover:bg-sya-navy/[0.07]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <IconPhone />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-medium text-sya-ink/45">
            {t.phoneLabel}
          </span>
          <span className="block text-sm font-bold text-sya-navy">
            {PHONE_NUMBER_DISPLAY}
          </span>
        </span>
      </a>

      <a
        href={CONSULT_CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2.5 flex items-center gap-3 rounded-xl bg-sya-navy/[0.04] px-3.5 py-3 transition-colors hover:bg-sya-navy/[0.07]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <IconChat />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-medium text-sya-ink/45">
            {t.kakaoLabel}
          </span>
          <span className="block text-sm font-bold text-sya-navy">
            {KAKAO_CHANNEL_ID}
          </span>
        </span>
      </a>

      <button
        type="button"
        onClick={() => openConsultation()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sya-ink to-sya-navy px-5 py-3 text-xs font-bold text-white shadow-lg shadow-sya-navy/20 transition-transform hover:-translate-y-0.5"
      >
        <IconBubble />
        {t.ctaButton}
      </button>

      <p className="mt-3.5 flex items-center gap-1.5 text-[11px] font-medium text-sya-ink/40">
        <IconShield />
        {t.accreditation}
      </p>
    </div>
  );
}
