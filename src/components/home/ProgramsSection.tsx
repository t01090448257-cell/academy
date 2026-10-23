import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/config/i18n";
import type { Dictionary, ProgramInfoItem } from "@/types/dictionary";
import {
  PROGRAM_GROUPS,
  PROGRAM_GROUP_ORDER,
  programCategoryHref,
  programHref,
  type ProgramGroupId,
} from "@/config/programs";
import { HOME_SECTION_Y } from "@/components/home/sectionSpacing";

interface ProgramsSectionProps {
  lang: Locale;
  dict: Dictionary;
}

/** 카테고리 대표 이미지 (기존 이미지 재사용, 둘 다 원본 4:3) */
const EXPERIENCE_IMAGES: Record<ProgramGroupId, string> = {
  regular: "/images/sya-photos/general-english.png",
  camp: "/images/sya-photos/activity-island.png",
};

/** 영문 메타데이터 + 현지어 설명 (Hero의 핵심 정보와 같은 editorial 스타일) */
function InfoMeta({ item }: { item: ProgramInfoItem }) {
  return (
    <div className="flex flex-col gap-1">
      <dt lang="en" className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sya-gold-deep">
        {item.label}
      </dt>
      <dd className="flex flex-col gap-0.5">
        <span lang="en" className="text-sm font-semibold tracking-[0.08em] text-sya-navy">
          {item.value}
        </span>
        <span className="break-keep text-xs text-sya-ink/55">{item.localized}</span>
      </dd>
    </div>
  );
}

export default function ProgramsSection({ lang, dict }: ProgramsSectionProps) {
  const programs = dict.programs;
  const exp = programs.experience;

  return (
    <section aria-labelledby="programs-heading" className="border-t border-sya-ink/6 bg-sya-sky">
      <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
        {/* 섹션 헤더 + 공통 프로그램 정보 */}
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <h2 id="programs-heading" className="max-w-2xl">
            <span
              lang="en"
              className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-sya-gold-deep"
            >
              <span aria-hidden="true" className="h-px w-8 bg-sya-gold/70" />
              {exp.eyebrow}
            </span>
            <span className="mt-5 block break-keep text-3xl font-bold leading-tight tracking-tight text-sya-navy sm:text-4xl">
              {exp.title}
            </span>
          </h2>
          <dl className="grid shrink-0 grid-cols-2 gap-6 lg:gap-10 lg:border-s lg:border-sya-ink/10 lg:ps-10">
            <InfoMeta item={programs.duration} />
            <InfoMeta item={programs.classHours} />
          </dl>
        </div>

        {/* REGULAR / CAMP: PC 좌우 2열, 모바일 세로 */}
        <div className="mt-12 grid gap-14 lg:mt-14 lg:grid-cols-2 lg:gap-10 xl:gap-14">
          {PROGRAM_GROUP_ORDER.map((groupId) => {
            const group = programs.groups[groupId];
            const text = exp[groupId];
            const ids = PROGRAM_GROUPS[groupId];
            return (
              <article key={groupId} aria-labelledby={`experience-${groupId}`} className="flex flex-col">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-sya-sky">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={EXPERIENCE_IMAGES[groupId]}
                    alt={text.imageAlt}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover saturate-[0.92]"
                  />
                </div>

                <p lang="en" className="mt-7 flex items-baseline gap-3 text-[11px] font-semibold uppercase tracking-[0.26em] text-sya-gold-deep">
                  <span>{group.label}</span>
                  <span aria-hidden="true" className="h-px w-6 translate-y-[-3px] bg-sya-gold/60" />
                  <span className="normal-case tracking-normal text-sya-navy/55">{group.title}</span>
                </p>
                <h3
                  id={`experience-${groupId}`}
                  lang="en"
                  className="mt-4 text-2xl font-bold leading-snug tracking-tight text-sya-navy sm:text-[1.9rem]"
                >
                  {text.tagline}
                </h3>
                <p className="mt-4 max-w-lg break-keep text-sm leading-relaxed text-sya-ink/65 sm:text-[15px] lg:whitespace-pre-line">
                  {text.description}
                </p>

                {/* 포함 프로그램: 기존 과정 상세 링크 */}
                <div className="mt-7 border-t border-sya-ink/10 pt-5">
                  <p className="text-[11px] font-semibold text-sya-ink/45">{exp.includesLabel}</p>
                  <ul className="mt-3 space-y-2">
                    {ids.map((id) => (
                      <li key={id}>
                        <Link
                          href={programHref(lang, id)}
                          className="group inline-flex items-baseline gap-2 text-[15px] font-semibold text-sya-navy transition-colors hover:text-sya-gold-deep"
                        >
                          <span className="break-keep">{programs.courses[id].name}</span>
                          <span lang="en" className="text-[10px] font-medium uppercase tracking-[0.16em] text-sya-ink/40">
                            {programs.courses[id].englishName}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 자세히 보기: 카테고리 페이지가 있으면 그곳으로(REGULAR), 없으면 첫 과정 상세로(CAMP) */}
                <Link
                  href={programCategoryHref(lang, groupId) ?? programHref(lang, ids[0])}
                  className="group mt-7 inline-flex w-fit items-center gap-2 rounded-full border border-sya-navy/20 px-7 py-3 text-sm font-semibold text-sya-navy transition-colors hover:border-sya-navy/45 hover:bg-sya-navy/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sya-navy"
                >
                  {programs.learnMore}
                  <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
