"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/config/i18n";
import type { Dictionary } from "@/types/dictionary";
import { useConsultationModal } from "@/components/common/ConsultationModalProvider";

interface HeroSectionProps {
  lang: Locale;
  dict: Dictionary;
  /** 연수 비용(실시간 계산기) 섹션으로 이동할 앵커/경로. 기본값 "#calculator" */
  calculatorHref?: string;
}

/** 단일 대표 히어로 이미지 (세부 리조트형 캠퍼스) */
const HERO_IMAGE = "/images/sya-photos/hero-campus.png";

/**
 * 설명 문구에서 굵게 강조할 단어 (언어별). dictionary 문구는 그대로 두고 화면에서만 강조합니다.
 * 단어는 각 언어 설명 문구에 실제로 나오는 형태 그대로 적어야 합니다.
 */
const DESCRIPTION_EMPHASIS: Partial<Record<Locale, string[]>> = {
  ko: ["스피킹", "회화"],
  en: ["speaking", "conversation"],
  ja: ["スピーキング", "会話"],
  vi: ["kỹ năng nói", "hội thoại"],
  "zh-TW": ["口說", "會話"],
  mn: ["Ярих чадвар", "харилцан ярианд"],
  ru: ["разговорную речь", "живое общение"],
  ar: ["التحدث", "المحادثة"],
};

/**
 * text 안의 강조 단어만 <strong>으로 감싸 반환 (그 외 문자열·줄바꿈은 그대로)
 * 강조 스타일: 굵게 + 흰 글자 + 선명한 Blue(#1677A8) 짧은 박스. 여러 단어 표현도 한 줄로 유지(whitespace-nowrap)
 */
function emphasize(text: string, words: string[] | undefined) {
  if (!words || words.length === 0) return text;
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "g"));
  return parts.map((part, i) =>
    words.includes(part) ? (
      <strong
        key={i}
        className="whitespace-nowrap rounded-[3px] bg-[#1677A8] px-1 py-0.5 font-bold text-white"
      >
        {part}
      </strong>
    ) : (
      part
    )
  );
}

/** 모토를 단어 기준 절반으로 나눠 두 줄로 표시 (예: BRIDGING FUTURE / THROUGH EDUCATION) */
function splitInTwoLines(text: string): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return [text];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

export default function HeroSection({
  lang,
  dict,
  calculatorHref = "#calculator",
}: HeroSectionProps) {
  const { openConsultation } = useConsultationModal();
  const hero = dict.hero;

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate flex flex-col overflow-hidden bg-sya-navy text-white lg:min-h-[720px]"
    >
      {/* ── 배경: 단일 대표 이미지 + 가독성용 오버레이 ── */}
      <div className="absolute inset-0 -z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMAGE}
          alt={hero.imageAlt}
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover object-[62%_center] saturate-[0.92] lg:object-center"
        />
        {/* 모바일/태블릿: 하단(텍스트 영역)으로 갈수록 짙어지는 네이비 — 위쪽(하늘·야자수)은 사진 색이 살아나도록 옅게 */}
        <div className="absolute inset-0 bg-gradient-to-t from-sya-navy/95 via-sya-navy/70 to-sya-navy/12 lg:hidden" />
        {/* 데스크톱: 왼쪽 텍스트 영역에만 subtle gradient, 오른쪽은 캠퍼스가 그대로 보이도록 */}
        {/* ar(RTL)에서는 텍스트가 오른쪽에 오므로 그라데이션 방향만 반대로 (사진은 반전하지 않음) */}
        <div className="absolute inset-0 hidden bg-gradient-to-r from-sya-navy/92 from-15% via-sya-navy/55 via-45% to-transparent to-75% rtl:bg-gradient-to-l lg:block" />
        {/* 상·하단 가장자리 톤 정리 (헤더 경계, trust strip 가독성) */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sya-navy/30 to-transparent lg:from-sya-navy/45" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-sya-navy/80 to-transparent lg:from-sya-navy/85" />
      </div>

      {/* ── 메인 콘텐츠 ── */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 items-end px-6 pb-16 pt-26 sm:px-8 sm:pt-42 lg:items-center lg:pb-16 lg:pt-[50px]">
        <div className="w-full max-w-xl lg:max-w-[40rem]">
          {/* Brand motto (eyebrow보다 조금 크게, 메인 제목보다 훨씬 작게) */}
          <p
            lang="en"
            className="mb-4 text-balance text-[19px] font-bold uppercase leading-snug tracking-[0.14em] text-[#F5DFA8] sm:mb-5 sm:text-[21px] lg:text-2xl lg:tracking-[0.12em]"
          >
            {splitInTwoLines(hero.motto).map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>

          {/* Eyebrow */}
          <p className="flex items-center gap-3 text-[12.5px] font-semibold uppercase leading-snug tracking-[0.2em] text-[#E2C68E] sm:text-sm lg:text-base lg:tracking-[0.24em]">
            <span aria-hidden="true" className="h-px w-8 bg-sya-gold/70" />
            <span>{hero.eyebrow}</span>
          </p>

          {/* Headline: 1행 가볍게, 2행 굵게 */}
          <h1
            id="hero-heading"
            className="mt-6 break-keep text-balance"
          >
            <span className="block text-2xl font-light leading-snug tracking-tight text-white/85 sm:text-3xl lg:text-[2.35rem]">
              {hero.headlineLine1}
            </span>
            <span className="mt-1 block text-[2.35rem] font-bold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-[3.9rem]">
              {hero.headlineLine2}
            </span>
          </h1>

          {/* Accent */}
          <p
            lang="en"
            className="mt-5 inline-block bg-gradient-to-r from-[#F1E2BE] via-[#E2C68E] to-[#BFD3EA] bg-clip-text font-serif text-xl italic text-transparent sm:text-2xl"
          >
            {hero.accent}
          </p>

          {/* Description ("\n"은 데스크톱에서만 줄바꿈) */}
          <p className="mt-5 max-w-lg break-keep text-[15px] leading-relaxed text-slate-200/85 sm:text-base lg:max-w-xl lg:whitespace-pre-line">
            {emphasize(hero.description, DESCRIPTION_EMPHASIS[lang])}
          </p>

          {/* CTA */}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <button
              type="button"
              onClick={() => openConsultation()}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-sya-navy shadow-lg shadow-black/20 transition-colors hover:bg-sya-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span>{hero.ctaPrimary}</span>
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
              />
            </button>

            <Link
              href={`/${lang}/programs`}
              className="inline-flex items-center justify-center rounded-full border border-white/35 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white/70 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {hero.ctaPrograms}
            </Link>

            <a
              href={calculatorHref}
              className="inline-flex items-center justify-center px-2 py-2 text-sm font-medium text-white/75 underline decoration-white/30 underline-offset-[6px] transition-colors hover:text-white hover:decoration-white/70 sm:py-3.5"
            >
              {hero.ctaCost}
            </a>
          </div>

          {/* 핵심 정보 (editorial metadata) */}
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/15 pt-6 sm:grid-cols-4 sm:gap-x-0">
            {hero.facts.map((fact, i) => (
              <div
                key={fact.value}
                className={`flex flex-col-reverse gap-1 ${
                  i > 0 ? "sm:border-s sm:border-white/15 sm:ps-5" : "sm:pe-5"
                }`}
              >
                <dt className="break-keep text-xs leading-snug text-slate-300/90">
                  {fact.label}
                </dt>
                <dd
                  lang="en"
                  className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white"
                >
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* ── 하단 trust strip ── */}
      <div className="border-t border-white/10 bg-sya-navy/40">
        <p
          lang="en"
          className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-6 py-4 text-[10px] font-medium uppercase tracking-[0.32em] text-white/55 sm:px-8 sm:text-[11px]"
        >
          {hero.trustStrip.map((item, i) => (
            <span key={item} className="flex items-center gap-4">
              {i > 0 && (
                <span aria-hidden="true" className="text-sya-gold/60">
                  ·
                </span>
              )}
              <span>{item}</span>
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
