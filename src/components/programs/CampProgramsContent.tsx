import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/config/i18n";
import type { Dictionary, ProgramInfoItem } from "@/types/dictionary";
import {
  PROGRAM_GROUPS,
  hasLocalSchoolExperience,
  programHref,
  type ProgramCourseId,
} from "@/config/programs";
import { HOME_SECTION_Y } from "@/components/home/sectionSpacing";
import ConsultButton from "@/components/common/ConsultButton";

interface CampProgramsContentProps {
  lang: Locale;
  dict: Dictionary;
}

/** 기존 이미지 재사용 (파일 이동·수정 없음) */
const CAMP_IMAGES: Partial<Record<ProgramCourseId, string>> = {
  summerWinterCamp: "/images/sya-photos/activity-island.png",
  familyCamp: "/images/sya-photos/junior-family.png",
};
const STAY_IMAGE = "/images/be-pods/twin-room-web.jpg";
const MEALS_IMAGE = "/images/sya-photos/fruit/fruit-1.png";

/** REGULAR 페이지와 같은 버튼 스타일 */
const OUTLINE_BUTTON =
  "group inline-flex w-fit items-center gap-2 rounded-full border border-sya-navy/20 px-6 py-3 text-sm font-semibold text-sya-navy transition-colors hover:border-sya-navy/45 hover:bg-sya-navy/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sya-navy";
const LIGHT_BUTTON =
  "group inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-sya-navy transition-colors hover:bg-sya-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/** Sky 배경 CTA용 Primary 버튼 (Deep Navy + 흰 글자, hover는 Text Navy로 살짝 밝게) */
const NAVY_BUTTON =
  "group inline-flex items-center justify-center gap-2 rounded-full bg-sya-navy px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-sya-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sya-navy";
/** Sky 배경 CTA용 Secondary 버튼 (흰 배경 + Deep Navy 테두리·글자) */
const NAVY_OUTLINE_BUTTON =
  "group inline-flex items-center justify-center gap-2 rounded-full border border-sya-navy/30 bg-white px-7 py-3.5 text-sm font-semibold text-sya-navy transition-colors hover:border-sya-navy/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sya-navy";

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
        <span className="break-keep text-base text-sya-ink/60">{item.localized}</span>
      </dd>
    </div>
  );
}

export default function CampProgramsContent({ lang, dict }: CampProgramsContentProps) {
  const programs = dict.programs;
  const page = programs.campPage;
  const group = programs.groups.camp;
  // 히어로 Breadcrumb·Eyebrow: 페이지 전용 키가 있으면 사용 (현재 ko만), 없으면 기존 영문 그룹명
  const breadcrumbLabel = page.breadcrumbLabel ?? group.label;
  const breadcrumbLang = page.breadcrumbLabel ? lang : "en";
  const heroLabel = page.heroLabel ?? group.label;
  const ids = PROGRAM_GROUPS.camp;
  const familyOptions = programs.courses.familyCamp.familyOptions ?? [];
  const localSchool = programs.detail.localSchool;

  return (
    <main>
      {/* ── HERO (REGULAR와 같은 compact 비율) ── */}
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
              {programs.experience.camp.tagline}
            </h1>
            <p className="mt-6 max-w-xl break-keep text-[15px] leading-relaxed text-white/75 sm:text-base lg:whitespace-pre-line">
              {page.description}
            </p>
            <ConsultButton course="summerWinterCamp" className={`mt-9 ${LIGHT_BUTTON}`}>
              <span>{page.consultCta}</span>
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
            </ConsultButton>
          </div>
        </div>
      </section>

      {/* ── OUR CAMP PROGRAMS: 2개 동일 비중 ── */}
      <section aria-labelledby="camp-list-heading" className="bg-sya-sky">
        <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
          <h2 id="camp-list-heading" className="max-w-2xl">
            <Eyebrow>{page.listEyebrow}</Eyebrow>
            <span className="mt-5 block break-keep text-3xl font-bold leading-tight tracking-tight text-sya-navy sm:text-4xl lg:whitespace-pre-line">
              {page.listTitle}
            </span>
          </h2>

          <ol className="mt-12 grid gap-14 md:grid-cols-2 md:gap-8 lg:mt-14 lg:gap-10">
            {ids.map((id, index) => {
              const override = page.programs[id];
              const name = programs.courses[id].name;
              return (
                <li key={id}>
                  <article aria-labelledby={`camp-${id}`} className="flex h-full flex-col">
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-sya-sky">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={CAMP_IMAGES[id]}
                        alt={override?.imageAlt ?? name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover saturate-[0.92]"
                      />
                    </div>
                    <div className="mt-7 flex flex-1 flex-col">
                      <span aria-hidden="true" className="text-xs font-semibold tabular-nums tracking-[0.2em] text-sya-gold-deep">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p lang="en" className="mt-4 text-[13px] font-semibold uppercase tracking-[0.2em] text-sya-navy/60">
                        {override?.englishName ?? programs.courses[id].englishName}
                      </p>
                      <h3 id={`camp-${id}`} className="mt-1 break-keep text-2xl font-bold tracking-tight text-sya-navy sm:text-[1.75rem]">
                        {name}
                      </h3>
                      <p className="mt-4 max-w-lg break-keep text-sm leading-relaxed text-sya-ink/65 sm:text-[15px] lg:whitespace-pre-line">
                        {override?.summary ?? programs.courses[id].summary}
                      </p>
                      <Link href={programHref(lang, id)} className={`mt-7 md:mt-auto md:pt-7 ${OUTLINE_BUTTON}`}>
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

      {/* ── WHAT MAKES SYA CAMP DIFFERENT? ── */}
      <section aria-labelledby="camp-different-heading" className="border-t border-sya-ink/6 bg-white">
        <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
          <h2 id="camp-different-heading">
            <Eyebrow>{page.different.eyebrow}</Eyebrow>
          </h2>
          <ol className="mt-10 grid gap-10 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4 lg:gap-8">
            {page.different.items.map((item, index) => (
              <li key={item.label} className="border-t border-sya-navy/20 pt-6">
                <span aria-hidden="true" className="text-xs font-semibold tabular-nums tracking-[0.2em] text-sya-gold-deep">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p lang="en" className="mt-3 text-xl font-bold tracking-[0.08em] text-sya-navy sm:text-2xl">
                  {item.label}
                </p>
                <p className="mt-3 break-keep text-base leading-relaxed text-sya-ink/60">{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── A DAY AT SYA CAMP: 시간표가 아닌 경험의 흐름 ── */}
      <section aria-labelledby="camp-day-heading" className="bg-sya-soft">
        <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <h2 id="camp-day-heading">
              <Eyebrow>{page.day.eyebrow}</Eyebrow>
            </h2>
            <dl className="lg:text-end">
              <dt lang="en" className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sya-gold-deep">
                {programs.classHours.label}
              </dt>
              <dd lang="en" className="mt-1 text-sm font-semibold tracking-[0.08em] text-sya-navy">
                {programs.classHours.value}
              </dd>
            </dl>
          </div>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:mt-12 lg:grid-cols-5 lg:gap-0">
            {page.day.steps.map((step, index) => (
              <li key={step.label} className="border-t border-sya-navy/20 pt-5 lg:pe-6">
                <p lang="en" className="flex items-center gap-3 text-base font-bold tracking-[0.1em] text-sya-navy sm:text-lg">
                  {step.label}
                  {index < page.day.steps.length - 1 && (
                    <ArrowRight aria-hidden="true" className="hidden h-4 w-4 shrink-0 text-sya-gold lg:block rtl:-scale-x-100" />
                  )}
                </p>
                <p className="mt-2 break-keep text-base leading-relaxed text-sya-ink/60">{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 break-keep text-[13.5px] text-sya-ink/50">* {page.day.note}</p>
        </div>
      </section>

      {/* ── CAMP OPERATING SYSTEM: source-based operating information ── */}
      {page.operations && (
        <>
          <section aria-labelledby="camp-operations-heading" className="bg-white">
            <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
              <h2 id="camp-operations-heading" className="max-w-3xl">
                <Eyebrow>{page.operations.eyebrow}</Eyebrow>
                <span className="mt-5 block break-keep text-3xl font-bold leading-tight tracking-tight text-sya-navy sm:text-4xl">
                  {page.operations.title}
                </span>
                <span className="mt-5 block max-w-2xl break-keep text-base font-normal leading-relaxed text-sya-ink/60">
                  {page.operations.intro}
                </span>
              </h2>

              <div className="mt-14 grid gap-14 lg:grid-cols-12 lg:gap-16">
                <div className="lg:col-span-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sya-gold-deep">{page.operations.levelTitle}</p>
                  <p className="mt-4 break-keep text-lg leading-relaxed text-sya-ink/65">{page.operations.levelIntro}</p>
                </div>
                <ol className="lg:col-span-7 grid gap-0 sm:grid-cols-2">
                  {page.operations.levels.map(([code, name, text]) => (
                    <li key={code} className="border-t border-sya-navy/15 py-5 pe-6">
                      <div className="flex items-baseline gap-3">
                        <span className="text-xs font-semibold tracking-[0.18em] text-sya-gold-deep">{code}</span>
                        <span className="text-lg font-bold text-sya-navy">{name}</span>
                      </div>
                      <p className="mt-2 break-keep text-sm leading-relaxed text-sya-ink/60">{text}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          <section aria-labelledby="camp-schedule-heading" className="bg-sya-soft">
            <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
              <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
                <div className="lg:col-span-4">
                  <Eyebrow>{page.operations.dayTitle}</Eyebrow>
                  <p id="camp-schedule-heading" className="mt-5 break-keep text-base leading-relaxed text-sya-ink/60">{page.operations.dayIntro}</p>
                  <p className="mt-5 text-sm font-semibold text-sya-navy">{programs.classHours.localized}</p>
                </div>
                <ol className="lg:col-span-8 grid gap-0 sm:grid-cols-2">
                  {page.operations.schedule.map(([time, activity]) => (
                    <li key={`${time}-${activity}`} className="grid grid-cols-[105px_1fr] gap-4 border-t border-sya-navy/15 py-4">
                      <time className="text-xs font-semibold tracking-[0.08em] text-sya-gold-deep">{time}</time>
                      <span className="break-keep text-sm leading-relaxed text-sya-navy">{activity}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          <section aria-labelledby="camp-level-ops-heading" className="bg-white">
            <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
              <Eyebrow>{page.operations.levelOpsTitle}</Eyebrow>
              <div id="camp-level-ops-heading" className="mt-10 grid gap-10 md:grid-cols-2">
                {page.operations.levelOps.map(([label, text]) => (
                  <article key={label} className="border-t border-sya-navy/20 pt-6">
                    <h3 className="text-xl font-bold text-sya-navy">{label}</h3>
                    <p className="mt-3 break-keep text-base leading-relaxed text-sya-ink/60">{text}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section aria-labelledby="camp-care-heading" className="bg-sya-sky">
            <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
              <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
                <div className="lg:col-span-4">
                  <Eyebrow>{page.operations.careTitle}</Eyebrow>
                  <h2 id="camp-care-heading" className="mt-5 text-2xl font-bold tracking-tight text-sya-navy sm:text-3xl">{page.operations.careTeamTitle}</h2>
                  <p className="mt-4 break-keep text-base leading-relaxed text-sya-ink/60">{page.operations.careTeamIntro}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {page.operations.roles.map((role) => (
                      <span key={role} className="rounded-full border border-sya-navy/15 bg-white px-4 py-2 text-sm font-semibold text-sya-navy">{role}</span>
                    ))}
                  </div>
                </div>
                <ul className="lg:col-span-8 grid gap-0 sm:grid-cols-2">
                  {page.operations.care.map((item) => (
                    <li key={item} className="border-t border-sya-navy/15 py-4 pe-6 text-sm leading-relaxed text-sya-ink/70">{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section aria-labelledby="camp-weekly-heading" className="bg-white">
            <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
              <Eyebrow>{page.operations.weeklyTitle}</Eyebrow>
              <div id="camp-weekly-heading" className="mt-10 grid gap-0 sm:grid-cols-2 lg:grid-cols-7">
                {page.operations.weekly.map(([day, activity]) => (
                  <div key={day} className="border-t border-sya-navy/15 py-5 pe-5 lg:border-s-0 lg:border-e lg:px-5 lg:first:ps-0 lg:last:border-e-0 lg:last:pe-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sya-gold-deep">{day}</p>
                    <p className="mt-3 break-keep text-sm font-semibold leading-relaxed text-sya-navy">{activity}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section aria-labelledby="camp-outcomes-heading" className="bg-sya-soft">
            <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
              <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
                <div className="lg:col-span-4">
                  <Eyebrow>{page.operations.outcomesTitle}</Eyebrow>
                  <h2 id="camp-outcomes-heading" className="mt-5 text-2xl font-bold tracking-tight text-sya-navy sm:text-3xl">{page.operations.outcomesTitle}</h2>
                </div>
                <ol className="lg:col-span-8 grid gap-0 sm:grid-cols-2">
                  {page.operations.outcomes.map((item, index) => (
                    <li key={item} className="border-t border-sya-navy/15 py-5 pe-6">
                      <span className="text-xs font-semibold tabular-nums tracking-[0.2em] text-sya-gold-deep">{String(index + 1).padStart(2, '0')}</span>
                      <p className="mt-2 break-keep text-sm leading-relaxed text-sya-ink/70">{item}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ── STAY & MEALS ── */}
      <section aria-labelledby="camp-stay-heading" className="bg-white">
        <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
          <h2 id="camp-stay-heading">
            <Eyebrow>{page.stayMeals.eyebrow}</Eyebrow>
          </h2>
          <div className="mt-10 grid gap-14 md:grid-cols-2 md:gap-8 lg:mt-12 lg:gap-10">
            {[
              { item: page.stayMeals.stay, src: STAY_IMAGE },
              { item: page.stayMeals.meals, src: MEALS_IMAGE },
            ].map(({ item, src }) => (
              <figure key={item.label}>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-sya-sky">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={item.imageAlt} loading="lazy" decoding="async" className="h-full w-full object-cover saturate-[0.92]" />
                </div>
                <figcaption className="mt-6">
                  <span lang="en" className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-sya-gold-deep">
                    {item.label}
                  </span>
                  <span className="mt-2 block break-keep text-xl font-bold text-sya-navy">{item.name}</span>
                  <span className="mt-2 block break-keep text-base leading-relaxed text-sya-ink/60 lg:whitespace-pre-line">
                    {item.description}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAMILY CAMP: 가족 구성 3가지 (+ 가족캠프에만 Local School Experience) ── */}
      <section aria-labelledby="camp-family-heading" className="bg-sya-sky">
        <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <h2 id="camp-family-heading">
                <Eyebrow>{page.family.eyebrow}</Eyebrow>
              </h2>
              <p className="mt-6 break-keep text-2xl font-bold leading-snug tracking-tight text-sya-navy sm:text-3xl lg:whitespace-pre-line">
                {page.family.message}
              </p>
            </div>
            <ol className="lg:col-span-6 lg:col-start-7">
              {page.family.optionLabels.map((label, index) => (
                <li key={label} className="flex items-baseline gap-5 border-t border-sya-navy/15 py-5 last:border-b">
                  <span aria-hidden="true" className="text-xs font-semibold tabular-nums tracking-[0.2em] text-sya-gold-deep">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
                    <span lang="en" className="text-base font-bold tracking-[0.1em] text-sya-navy sm:text-lg">
                      {label}
                    </span>
                    {familyOptions[index] && (
                      <span className="break-keep text-base text-sya-ink/60">{familyOptions[index]}</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* LOCAL SCHOOL EXPERIENCE: 특정 학교명·학교 홈페이지 링크 없음 (학교명 미확정 — 제휴로 표현하지 않음) */}
          {hasLocalSchoolExperience("familyCamp") && (
            <aside
              aria-labelledby="camp-local-school-heading"
              className="mt-14 grid gap-6 border-t border-sya-ink/10 pt-8 lg:grid-cols-12 lg:items-end lg:gap-16"
            >
              <div className="lg:col-span-7">
                <p lang="en" className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sya-gold-deep">
                  {localSchool.label}
                </p>
                <h3 id="camp-local-school-heading" className="mt-3 break-keep text-lg font-bold text-sya-navy">
                  {localSchool.title}
                </h3>
                <p className="mt-2 break-keep text-base leading-relaxed text-sya-ink/65">{localSchool.description}</p>
                <p className="mt-2 break-keep text-[13.5px] leading-relaxed text-sya-ink/50">
                  {localSchool.conditionNote}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:col-span-5 lg:justify-end">
                <ConsultButton course="familyCamp" prefill={{ interests: ["localSchool"] }} className={OUTLINE_BUTTON}>
                  <span>{localSchool.consultCta}</span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
                </ConsultButton>
              </div>
            </aside>
          )}
        </div>
      </section>

      {/* ── PROGRAM INFORMATION ── */}
      <section aria-labelledby="camp-info-heading" className="bg-sya-soft">
        <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
          <h2 id="camp-info-heading">
            <Eyebrow>{page.infoEyebrow}</Eyebrow>
          </h2>
          <dl className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-10">
            <InfoMeta item={programs.duration} />
            <InfoMeta item={programs.classHours} />
            <InfoMeta item={page.schedule} />
          </dl>
        </div>
      </section>

      {/* ── 상담 CTA: 과정 미리 선택 ── */}
      <section aria-labelledby="camp-closing-heading" className="bg-sya-sky text-sya-navy">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-16 sm:px-8 sm:py-20 lg:flex-row lg:items-center lg:justify-between">
          <h2 id="camp-closing-heading" className="break-keep text-2xl font-bold tracking-tight sm:text-3xl">
            {page.closingTitle}
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ConsultButton course="summerWinterCamp" className={NAVY_BUTTON}>
              <span>{page.closingSummerCta}</span>
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
            </ConsultButton>
            <ConsultButton course="familyCamp" className={NAVY_OUTLINE_BUTTON}>
              <span>{page.closingFamilyCta}</span>
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
            </ConsultButton>
          </div>
        </div>
      </section>
    </main>
  );
}
