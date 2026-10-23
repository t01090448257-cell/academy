import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/config/i18n";
import type { AdhdDictionary } from "@/types/dictionary";

interface AdhdProgramIntroProps {
  lang: Locale;
  adhd: AdhdDictionary;
}

/** 기존 SYA 이미지 에셋 재사용 (학생과 선생님의 1:1 수업 사진) */
const INTRO_IMAGE = "/images/sya-photos/ielts-prep.png";

/** 상세 페이지 경로 (정적 경로, query 없음) */
export function adhdProgramHref(lang: string): string {
  return `/${lang}/programs/adhd`;
}

/**
 * 메인 페이지 OUR PROGRAMS(REGULAR / CAMP) 바로 아래에 이어지는 ADHD 맞춤형 영어교육 소개 카드.
 * - ProgramsSection과 같은 Sky Blue 배경을 이어 써서 OUR PROGRAMS의 일부처럼 보이게 하고,
 *   위쪽 여백은 두지 않습니다. (ProgramsSection의 아래 여백을 그대로 사용)
 * - 기존 ProgramsSection·REGULAR/CAMP 레이아웃은 수정하지 않습니다.
 */
export default function AdhdProgramIntro({ lang, adhd }: AdhdProgramIntroProps) {
  const text = adhd.home;
  const showLocalTitle = text.title.trim() !== text.englishTitle.trim();

  return (
    <section aria-labelledby="adhd-intro-heading" className="bg-sya-sky">
      <div className="mx-auto max-w-7xl px-6 pb-16 sm:px-8 sm:pb-[4.5rem] lg:pb-24">
        <article className="grid overflow-hidden rounded-lg border border-sya-ink/8 bg-white md:grid-cols-12">
          <div className="relative aspect-[4/3] w-full bg-sya-soft md:col-span-5 md:aspect-auto md:min-h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={INTRO_IMAGE}
              alt={text.imageAlt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover saturate-[0.92] md:absolute md:inset-0"
            />
          </div>

          <div className="flex flex-col p-7 sm:p-10 md:col-span-7 lg:p-12">
            <p
              lang="en"
              className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-sya-gold-deep"
            >
              <span aria-hidden="true" className="h-px w-8 bg-sya-gold/70" />
              Specialized Program
            </p>

            <h3
              id="adhd-intro-heading"
              lang="en"
              className="mt-5 text-2xl font-bold leading-snug tracking-tight text-sya-navy sm:text-[1.9rem]"
            >
              {text.englishTitle}
            </h3>
            {showLocalTitle && (
              <p className="mt-1.5 break-keep wrap-anywhere text-base font-semibold text-sya-navy/70 sm:text-lg">{text.title}</p>
            )}

            <p className="mt-4 max-w-xl break-keep wrap-anywhere text-sm leading-relaxed text-sya-ink/65 sm:text-[15px]">
              {text.description}
            </p>

            <ul className="mt-6 grid gap-x-8 gap-y-3 border-t border-sya-ink/10 pt-6 sm:grid-cols-2">
              {text.points.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm font-medium text-sya-navy">
                  <span aria-hidden="true" className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-sya-gold" />
                  <span className="break-keep wrap-anywhere">{point}</span>
                </li>
              ))}
            </ul>

            <Link
              href={adhdProgramHref(lang)}
              aria-describedby="adhd-intro-heading"
              className="group mt-8 inline-flex w-fit items-center gap-2 rounded-full border border-sya-navy/20 px-7 py-3 text-sm font-semibold text-sya-navy transition-colors hover:border-sya-navy/45 hover:bg-sya-navy/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sya-navy"
            >
              {text.cta}
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
              />
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
