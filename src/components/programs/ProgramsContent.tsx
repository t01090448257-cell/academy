"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import type { Locale } from "@/config/i18n";
import type { Dictionary } from "@/types/dictionary";
import {
  DEFAULT_PROGRAM_COURSE,
  PROGRAM_GROUPS,
  PROGRAM_GROUP_ORDER,
  PROGRAM_IMAGES,
  getProgramGroup,
  hasLocalSchoolExperience,
  isProgramCourseId,
  programHref,
  type ProgramCourseId,
} from "@/config/programs";
import ConsultSidebarCard from "@/components/common/ConsultSidebarCard";
import { useConsultationModal } from "@/components/common/ConsultationModalProvider";

interface ProgramsContentProps {
  lang: Locale;
  dict: Dictionary;
}

export default function ProgramsContent({ lang, dict }: ProgramsContentProps) {
  const programs = dict.programs;
  const ui = programs.detail;
  const searchParams = useSearchParams();
  const { openConsultation } = useConsultationModal();

  // 선택된 과정은 URL(?tab=)에서 바로 계산한다. (state/effect 동기화 불필요)
  const tabParam = searchParams.get("tab");
  const activeId: ProgramCourseId = isProgramCourseId(tabParam) ? tabParam : DEFAULT_PROGRAM_COURSE;
  const activeGroup = getProgramGroup(activeId);
  const course = programs.courses[activeId];
  const groupText = programs.groups[activeGroup];
  const courseIndex = PROGRAM_GROUPS[activeGroup].indexOf(activeId);

  const overview = [
    { label: ui.durationLabel, value: programs.duration.localized },
    { label: ui.classHoursLabel, value: programs.classHours.localized },
    // 개강일은 정규반에만 표시
    ...(activeGroup === "regular"
      ? [{ label: ui.openingsLabel, value: programs.groups.regular.openings.localized }]
      : []),
  ];

  return (
    <main className="bg-sya-soft">
      {/* 상단 배너 */}
      <section className="bg-sya-navy px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4">
          <div>
            <p
              lang="en"
              className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-sya-gold"
            >
              <span aria-hidden="true" className="h-px w-8 bg-sya-gold/70" />
              {programs.eyebrow}
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">{ui.pageTitle}</h1>
            <p className="mt-2 max-w-xl break-keep text-sm text-white/65 sm:text-base">{ui.pageSubtitle}</p>
          </div>
          <nav aria-label="Breadcrumb" className="text-[11px] font-medium text-white/50 sm:text-xs">
            <Link href={`/${lang}`} className="hover:text-white">
              {ui.breadcrumbHome}
            </Link>
            <span aria-hidden="true" className="mx-1.5">›</span>
            <span>{ui.pageTitle}</span>
            <span aria-hidden="true" className="mx-1.5">›</span>
            <span className="font-semibold text-sya-gold">{course.name}</span>
          </nav>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8 sm:pb-20 sm:pt-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr] lg:items-start lg:gap-10">
          {/* 좌측: 정규반 / 캠프반 과정 목록 */}
          <aside className="lg:sticky lg:top-24">
            <nav aria-label={ui.pageTitle} className="space-y-6">
              {PROGRAM_GROUP_ORDER.map((groupId) => {
                const group = programs.groups[groupId];
                return (
                  <div key={groupId}>
                    <p lang="en" className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sya-gold-deep">
                      {group.label}
                    </p>
                    <p className="mt-1 text-sm font-bold text-sya-navy">{group.title}</p>
                    <ul className="mt-3 space-y-1.5">
                      {PROGRAM_GROUPS[groupId].map((id, index) => {
                        const active = id === activeId;
                        return (
                          <li key={id}>
                            <Link
                              href={programHref(lang, id)}
                              scroll={false}
                              aria-current={active ? "page" : undefined}
                              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-start transition-colors ${
                                active
                                  ? "border-sya-navy bg-sya-navy text-white"
                                  : "border-sya-ink/8 bg-white text-sya-ink hover:border-sya-navy/30"
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className={`text-[11px] font-semibold tabular-nums tracking-[0.16em] ${
                                  active ? "text-sya-gold" : "text-sya-gold-deep"
                                }`}
                              >
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block break-keep text-[13px] font-semibold leading-snug">
                                  {programs.courses[id].name}
                                </span>
                                <span
                                  lang="en"
                                  className={`block truncate text-[10px] font-medium tracking-[0.12em] ${
                                    active ? "text-white/60" : "text-sya-ink/40"
                                  }`}
                                >
                                  {programs.courses[id].englishName}
                                </span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </nav>
            <ConsultSidebarCard lang={lang} />
          </aside>

          {/* 우측: 선택된 과정 상세 */}
          <article>
            <header>
              <p className="flex items-baseline gap-3">
                <span lang="en" className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sya-gold-deep">
                  {groupText.label}
                </span>
                <span aria-hidden="true" className="text-xs font-semibold tabular-nums tracking-[0.2em] text-sya-gold-deep">
                  {String(courseIndex + 1).padStart(2, "0")}
                </span>
              </p>
              <p lang="en" className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-sya-navy/55">
                {course.englishName}
              </p>
              <h2 className="mt-1 break-keep text-3xl font-bold tracking-tight text-sya-navy sm:text-4xl">
                {course.name}
              </h2>
              <p className="mt-3 max-w-2xl break-keep text-[15px] leading-relaxed text-sya-ink/65">
                {course.summary}
              </p>
              <p lang="en" className="mt-4 text-[11px] font-medium tracking-[0.06em] text-sya-ink/45">
                {course.keywords.join(" · ")}
              </p>
            </header>

            <div className="mt-8 aspect-[16/7] w-full overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={PROGRAM_IMAGES[activeId]}
                alt={course.name}
                decoding="async"
                className="h-full w-full object-cover saturate-[0.92]"
              />
            </div>

            {/* 운영 정보: 연수 기간 / 하루 최대 4시간 수업 · 전체 학습 프로그램 약 8시간 / (정규반) 개강일 */}
            <dl
              className={`mt-8 grid gap-px overflow-hidden rounded-2xl border border-sya-ink/8 bg-sya-ink/8 ${
                overview.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
              }`}
            >
              {overview.map((item) => (
                <div key={item.label} className="bg-white px-6 py-5">
                  <dt className="text-[11px] font-semibold text-sya-gold-deep">{item.label}</dt>
                  <dd className="mt-1.5 break-keep text-[15px] font-semibold text-sya-navy">{item.value}</dd>
                </div>
              ))}
            </dl>

            {/* 과정 목적 / 추천 대상 / 교육 방향 */}
            <dl className="mt-10 divide-y divide-sya-ink/8 border-y border-sya-ink/8">
              {[
                { label: ui.purposeLabel, value: course.purpose },
                { label: ui.audienceLabel, value: course.audience },
                { label: ui.directionLabel, value: course.direction },
              ].map((row) => (
                <div key={row.label} className="grid gap-2 py-6 sm:grid-cols-[160px_1fr] sm:gap-8">
                  <dt className="text-sm font-semibold text-sya-navy">{row.label}</dt>
                  <dd className="break-keep text-[15px] leading-relaxed text-sya-ink/70">{row.value}</dd>
                </div>
              ))}
              {course.familyOptions && (
                <div className="grid gap-2 py-6 sm:grid-cols-[160px_1fr] sm:gap-8">
                  <dt className="text-sm font-semibold text-sya-navy">{programs.familyOptionsLabel}</dt>
                  <dd>
                    <ul className="flex flex-wrap gap-2">
                      {course.familyOptions.map((option) => (
                        <li
                          key={option}
                          className="inline-flex items-center gap-1.5 rounded-full border border-sya-navy/15 bg-white px-3.5 py-1.5 text-sm font-medium text-sya-navy"
                        >
                          <Check aria-hidden="true" className="h-3.5 w-3.5 text-sya-gold-deep" />
                          {option}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
            </dl>

            {/* 주요 학습 영역 */}
            <section className="mt-10" aria-labelledby="focus-areas-heading">
              <h3 id="focus-areas-heading" className="text-base font-bold text-sya-navy">
                {ui.focusAreasLabel}
              </h3>
              <ol className="mt-4 grid gap-4 sm:grid-cols-3">
                {course.focusAreas.map((area, i) => (
                  <li key={area.title} className="rounded-2xl border border-sya-ink/8 bg-white p-5">
                    <span aria-hidden="true" className="text-[11px] font-semibold tabular-nums tracking-[0.2em] text-sya-gold-deep">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p lang="en" className="mt-2 font-serif text-lg italic text-sya-navy">
                      {area.title}
                    </p>
                    <p className="mt-2 break-keep text-[13px] leading-relaxed text-sya-ink/60">{area.description}</p>
                  </li>
                ))}
              </ol>
            </section>

            {/* LOCAL SCHOOL EXPERIENCE: config/programs.ts의 LOCAL_SCHOOL_EXPERIENCE_COURSES 과정에만 표시 (사진 없음)
                특정 학교명·학교 홈페이지 링크 없음 (학교명 미확정 — 제휴로 표현하지 않음) */}
            {hasLocalSchoolExperience(activeId) && (
              <section
                className="mt-10 border-y border-sya-ink/8 py-8"
                aria-labelledby="local-school-heading"
              >
                <p
                  lang="en"
                  className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-sya-gold-deep"
                >
                  <span aria-hidden="true" className="h-px w-8 bg-sya-gold/70" />
                  {ui.localSchool.label}
                </p>
                <div className="mt-4 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-10">
                  <div className="max-w-2xl">
                    <h3 id="local-school-heading" className="break-keep text-lg font-bold text-sya-navy">
                      {ui.localSchool.title}
                    </h3>
                    <p className="mt-3 break-keep text-[15px] leading-relaxed text-sya-ink/70">
                      {ui.localSchool.description}
                    </p>
                    <p className="mt-3 break-keep text-xs leading-relaxed text-sya-ink/50">
                      {ui.localSchool.conditionNote}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 self-start sm:items-end sm:self-end">
                  {/* 현지 학교 경험 상담: 현재 과정(familyCamp / studyAbroad) + 관심 경험 localSchool 자동 선택 */}
                  <button
                    type="button"
                    onClick={() => openConsultation(activeId, { interests: ["localSchool"] })}
                    className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-sya-navy/20 px-5 py-2.5 text-sm font-semibold text-sya-navy transition-colors hover:border-sya-navy/45 hover:bg-sya-navy/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sya-navy"
                  >
                    <span>{ui.localSchool.consultCta}</span>
                    <ArrowRight
                      aria-hidden="true"
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                    />
                  </button>
                  </div>
                </div>
              </section>
            )}

            {/* 일과 시간표: 확정 전에는 안내 문구, 확정 후 dictionary의 timetable 입력 시 표로 표시 */}
            <section className="mt-10" aria-labelledby="timetable-heading">
              <h3 id="timetable-heading" className="text-base font-bold text-sya-navy">
                {ui.timetableLabel}
              </h3>
              {course.timetable && course.timetable.length > 0 ? (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-sya-ink/8">
                  <table className="w-full min-w-[420px] border-collapse text-left text-sm rtl:text-right">
                    <thead>
                      <tr className="bg-sya-navy text-white">
                        <th scope="col" className="w-40 px-5 py-3 font-semibold">{ui.timeHeader}</th>
                        <th scope="col" className="px-5 py-3 font-semibold">{ui.subjectHeader}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {course.timetable.map((row, i) => (
                        <tr key={`${row.time}-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-sya-navy/[0.03]"}>
                          <td className="px-5 py-3 font-medium tabular-nums text-sya-navy/80">{row.time}</td>
                          <td className="px-5 py-3 text-sya-ink/70">{row.subject}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 break-keep rounded-2xl border border-dashed border-sya-ink/15 bg-white px-6 py-5 text-sm leading-relaxed text-sya-ink/60">
                  {ui.timetablePending}
                </p>
              )}
            </section>

            {/* 상담 CTA */}
            <section className="mt-12 flex flex-col gap-6 rounded-2xl bg-sya-navy p-7 text-white sm:flex-row sm:items-center sm:justify-between sm:p-9">
              <div className="max-w-md">
                <p className="text-lg font-bold">{ui.consultTitle}</p>
                <p className="mt-2 break-keep text-sm leading-relaxed text-white/70">{ui.consultDescription}</p>
              </div>
              <button
                type="button"
                onClick={() => openConsultation(activeId)}
                className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-sya-navy transition-colors hover:bg-sya-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {ui.consultCta}
                <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
              </button>
            </section>
          </article>
        </div>
      </section>
    </main>
  );
}
