import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/config/i18n";
import type { Dictionary, ProgramInfoItem } from "@/types/dictionary";
import {
  PROGRAM_GROUPS,
  PROGRAM_IMAGES,
  hasLocalSchoolExperience,
  programHref,
  type ProgramCourseId,
} from "@/config/programs";
import { HOME_SECTION_Y } from "@/components/home/sectionSpacing";
import ConsultButton from "@/components/common/ConsultButton";

interface RegularProgramsContentProps {
  lang: Locale;
  dict: Dictionary;
}

/** 사이트 공통 아웃라인 pill 버튼 (홈 PROGRAMS / LIVE & LEARN과 동일) */
const OUTLINE_BUTTON =
  "group inline-flex w-fit items-center gap-2 rounded-full border border-sya-navy/20 px-6 py-3 text-sm font-semibold text-sya-navy transition-colors hover:border-sya-navy/45 hover:bg-sya-navy/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sya-navy";

/** Hero와 같은 흰색 pill 버튼 (네이비 배경 위) */
const LIGHT_BUTTON =
  "group inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-sya-navy transition-colors hover:bg-sya-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/** Sky 배경 CTA용 Primary 버튼 (Deep Navy + 흰 글자, hover는 Text Navy로 살짝 밝게) */
const NAVY_BUTTON =
  "group inline-flex items-center justify-center gap-2 rounded-full bg-sya-navy px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-sya-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sya-navy";

function Eyebrow({ children, light = false, lang = "en" }: { children: string; light?: boolean; lang?: string }) {
  return (
    <p
      lang={lang}
      className={`flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] ${
        light ? "text-sya-gold" : "text-sya-gold-deep"
      }`}
    >
      <span aria-hidden="true" className={`h-px w-8 ${light ? "bg-sya-gold/70" : "bg-sya-gold/70"}`} />
      {children}
    </p>
  );
}

function InfoMeta({ item }: { item: ProgramInfoItem }) {
  return (
    <div className="flex flex-col gap-1 border-t border-sya-ink/10 pt-5">
      <dt lang="en" className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sya-gold-deep">
        {item.label}
      </dt>
      <dd className="flex flex-col gap-1">
        <span lang="en" className="text-base font-semibold tracking-[0.06em] text-sya-navy">
          {item.value}
        </span>
        <span className="break-keep text-sm text-sya-ink/60">{item.localized}</span>
      </dd>
    </div>
  );
}

export default function RegularProgramsContent({ lang, dict }: RegularProgramsContentProps) {
  const programs = dict.programs;
  const page = programs.regularPage;
  const group = programs.groups.regular;
  // 히어로 Breadcrumb·Eyebrow: 페이지 전용 키가 있으면 사용 (현재 ko만), 없으면 기존 영문 그룹명
  const breadcrumbLabel = page.breadcrumbLabel ?? group.label;
  const breadcrumbLang = page.breadcrumbLabel ? lang : "en";
  const heroLabel = page.heroLabel ?? group.label;
  const ids = PROGRAM_GROUPS.regular;

  function programText(id: ProgramCourseId) {
    const override = page.programs[id];
    return {
      englishName: override?.englishName ?? programs.courses[id].englishName,
      name: programs.courses[id].name,
      summary: override?.summary ?? programs.courses[id].summary,
    };
  }

  return (
    <main>
      {/* ── HERO ── */}
      <section className="bg-sya-navy text-white">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-8 sm:px-8 sm:pb-16 lg:pb-14 lg:pt-9">
          <nav aria-label="Breadcrumb" className="text-[11px] font-medium text-white/50 sm:text-xs">
            <Link href={`/${lang}`} className="hover:text-white">
              {programs.detail.breadcrumbHome}
            </Link>
            <span aria-hidden="true" className="mx-1.5">›</span>
            <Link href={`/${lang}/programs`} className="hover:text-white">
              {programs.detail.pageTitle}
            </Link>
            <span aria-hidden="true" className="mx-1.5">›</span>
            <span lang={breadcrumbLang} className="font-semibold text-sya-gold">
              {breadcrumbLabel}
            </span>
          </nav>

          <div className="mt-10 max-w-3xl lg:mt-9">
            <Eyebrow light>{heroLabel}</Eyebrow>
            <h1 lang="en" className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-[3.4rem]">
              {programs.experience.regular.tagline}
            </h1>
            <p className="mt-6 max-w-xl break-keep text-[15px] leading-relaxed text-white/75 sm:text-base lg:whitespace-pre-line">
              {page.description}
            </p>
            <ConsultButton className={`mt-9 ${LIGHT_BUTTON}`}>
              <span>{dict.hero.ctaPrimary}</span>
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
            </ConsultButton>
          </div>
        </div>
      </section>

      {/* ── OUR REGULAR PROGRAMS: 2 + 1 editorial layout ── */}
      <section aria-labelledby="regular-list-heading" className="bg-sya-sky">
        <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
          <h2 id="regular-list-heading" className="max-w-2xl">
            <Eyebrow>{page.listEyebrow}</Eyebrow>
            <span className="mt-5 block break-keep text-3xl font-bold leading-tight tracking-tight text-sya-navy sm:text-4xl lg:whitespace-pre-line">
              {page.listTitle}
            </span>
          </h2>

          <ol className="mt-12 grid gap-14 md:grid-cols-2 md:gap-x-8 md:gap-y-16 lg:mt-14 lg:gap-x-10">
            {ids.map((id, index) => {
              const text = programText(id);
              const isWide = index === 2; // 세 번째(유학 준비)는 PC에서 가로형으로 전체 폭 사용
              return (
                <li key={id} className={isWide ? "md:col-span-2" : undefined}>
                  <article
                    aria-labelledby={`regular-${id}`}
                    className={isWide ? "grid gap-8 md:grid-cols-12 md:items-center md:gap-10" : "flex h-full flex-col"}
                  >
                    <div
                      className={`relative w-full overflow-hidden rounded-lg bg-sya-sky ${
                        isWide ? "aspect-[4/3] md:col-span-7 lg:aspect-[3/2]" : "aspect-[4/3]"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={PROGRAM_IMAGES[id]}
                        alt={text.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover saturate-[0.92]"
                      />
                    </div>

                    <div className={isWide ? "md:col-span-5" : "mt-7 flex flex-1 flex-col"}>
                      <p className="flex items-baseline gap-3">
                        <span aria-hidden="true" className="text-xs font-semibold tabular-nums tracking-[0.2em] text-sya-gold-deep">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {hasLocalSchoolExperience(id) && (
                          <span
                            lang="en"
                            className="rounded-full border border-sya-gold/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sya-gold-deep"
                          >
                            {page.localSchoolTag}
                          </span>
                        )}
                      </p>
                      <p lang="en" className="mt-4 text-[13px] font-semibold uppercase tracking-[0.2em] text-sya-navy/60">
                        {text.englishName}
                      </p>
                      <h3 id={`regular-${id}`} className="mt-1 break-keep text-2xl font-bold tracking-tight text-sya-navy sm:text-[1.75rem]">
                        {text.name}
                      </h3>
                      <p className="mt-4 max-w-lg break-keep text-sm leading-relaxed text-sya-ink/65 sm:text-[15px] lg:whitespace-pre-line">
                        {text.summary}
                      </p>
                      <Link href={programHref(lang, id)} className={`mt-7 ${OUTLINE_BUTTON} ${isWide ? "" : "md:mt-auto"}`}>
                        {programs.learnMore}
                        <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── HOW YOU LEARN: 선 + 타이포그래피 흐름 ── */}
      <section aria-labelledby="how-you-learn-heading" className="border-t border-sya-ink/6 bg-white">
        <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-16">
            <h2 id="how-you-learn-heading" className="lg:col-span-5">
              <Eyebrow>{page.howYouLearn.eyebrow}</Eyebrow>
            </h2>
            <p className="break-keep text-sm leading-relaxed text-sya-ink/65 sm:text-[15px] lg:col-span-6 lg:col-start-7 lg:whitespace-pre-line">
              {page.howYouLearn.description}
            </p>
          </div>
          <ol lang="en" className="mt-10 grid gap-8 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4 lg:gap-0">
            {page.howYouLearn.steps.map((step, index) => (
              <li key={step} className="border-t border-sya-navy/20 pt-5 lg:pe-6">
                <span aria-hidden="true" className="text-xs font-semibold tabular-nums tracking-[0.2em] text-sya-gold-deep">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="mt-3 flex items-center gap-3 text-xl font-bold tracking-[0.08em] text-sya-navy sm:text-2xl">
                  {step}
                  {index < page.howYouLearn.steps.length - 1 && (
                    <ArrowRight aria-hidden="true" className="hidden h-4 w-4 text-sya-gold lg:block rtl:-scale-x-100" />
                  )}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── PROGRAM INFORMATION: 기존 운영 문구 재사용 ── */}
      <section aria-labelledby="regular-info-heading" className="bg-sya-soft">
        <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
          <h2 id="regular-info-heading">
            <Eyebrow>{page.infoEyebrow}</Eyebrow>
          </h2>
          <dl className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-10">
            <InfoMeta item={programs.duration} />
            <InfoMeta item={programs.classHours} />
            <InfoMeta item={group.openings} />
          </dl>
        </div>
      </section>

      {/* ── 상담 CTA ── */}
      <section aria-labelledby="regular-closing-heading" className="bg-sya-sky text-sya-navy">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-16 sm:px-8 sm:py-20 lg:flex-row lg:items-center lg:justify-between">
          <h2 id="regular-closing-heading" className="break-keep text-2xl font-bold tracking-tight sm:text-3xl">
            {page.closingTitle}
          </h2>
          <ConsultButton className={NAVY_BUTTON}>
            <span>{dict.hero.ctaPrimary}</span>
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
          </ConsultButton>
        </div>
      </section>
    </main>
  );
}
