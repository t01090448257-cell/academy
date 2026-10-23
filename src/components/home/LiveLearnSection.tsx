import Image from "next/image";
import { ArrowRight } from "lucide-react";
import ConsultButton from "@/components/common/ConsultButton";
import type { Dictionary } from "@/types/dictionary";
import { HOME_SECTION_Y } from "@/components/home/sectionSpacing";

interface LiveLearnSectionProps {
  dict: Dictionary;
}

/**
 * 현지 학교 체험 사진 (public/images/local-school-experience-replacement.png, 원본 1536×1024)
 * 특정 학교명·로고가 보이지 않는 사진. 4:3 틀에 맞춰 좌우가 조금 잘림(object-cover, 가운데 기준).
 * ※ 이전 사진 public/images/class_1.jpeg(학교명·로고 보임)는 학교 확정 후 재사용할 수 있도록 삭제하지 않고 보존 — 화면에서는 참조하지 않음
 */
const SCHOOL_IMAGE = "/images/local-school-experience-replacement.png";

/** 기존 Philippine Life 이미지 재사용 (원본 1672×941, 파일은 수정하지 않음) */
const LIFESTYLE_IMAGE = "/images/sya-photos/activities/island-hopping-1.png";

export default function LiveLearnSection({ dict }: LiveLearnSectionProps) {
  const l = dict.liveLearn;
  const points = l.familyStay
    ? [...l.points, { label: l.familyStay.label, title: l.familyStay.title, description: l.familyStay.description }]
    : l.points;

  return (
    <section aria-labelledby="live-learn-heading" className="border-t border-sya-ink/6 bg-white">
      <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
        {/* 헤더: 제목(좌) + 설명(우) */}
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-16">
          <h2 id="live-learn-heading" className="lg:col-span-7">
            <span
              lang="en"
              className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-sya-gold-deep"
            >
              <span aria-hidden="true" className="h-px w-8 bg-sya-gold/70" />
              {l.eyebrow}
            </span>
            <span className="mt-6 block break-keep text-3xl font-bold leading-tight tracking-tight text-sya-navy sm:text-4xl lg:text-[2.9rem] lg:whitespace-pre-line">
              {l.title}
            </span>
          </h2>
          <div className="space-y-4 lg:col-span-5 lg:pb-2">
            {l.description.map((paragraph) => (
              <p
                key={paragraph}
                className="break-keep text-sm leading-relaxed text-sya-ink/65 sm:text-[15px] lg:whitespace-pre-line"
              >
                {paragraph}
              </p>
            ))}
            <p className="flex gap-3 border-t border-sya-ink/10 pt-4 text-[13px] leading-relaxed text-sya-navy/80">
              <span aria-hidden="true" className="mt-2 h-px w-5 shrink-0 bg-sya-gold" />
              <span className="break-keep">{l.audienceNote}</span>
            </p>
            {/* 세부 한달살기 상담: 관심 경험 cebuMonthStay 자동 선택 */}
            <ConsultButton
              prefill={{ interests: ["cebuMonthStay"] }}
              className="group mt-2 inline-flex items-center gap-2 rounded-full border border-sya-navy/20 px-6 py-3 text-sm font-semibold text-sya-navy transition-colors hover:border-sya-navy/45 hover:bg-sya-navy/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sya-navy"
            >
              <span>{l.consultCta}</span>
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
            </ConsultButton>
          </div>
        </div>

        {/* 대형 lifestyle 이미지: 모바일 4:3, 태블릿 이상은 원본 비율(약 16:9) */}
        <figure className="mt-12 lg:mt-16">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-sya-soft sm:aspect-[1672/941]">
            <Image
              src={LIFESTYLE_IMAGE}
              alt={l.image.alt}
              fill
              sizes="(min-width: 1280px) 1216px, 100vw"
              className="object-cover object-[55%_center]"
            />
          </div>
          <figcaption lang="en" className="mt-3 text-[11px] font-medium uppercase tracking-[0.2em] text-sya-ink/45">
            {l.image.caption}
          </figcaption>
        </figure>

        {/* 경험 포인트: 카드 대신 상단 라인 + 번호 + 타이포그래피 */}
        <ol className="mt-14 grid gap-12 md:grid-cols-3 md:gap-8 lg:mt-16 lg:gap-12">
          {points.map((point, index) => (
            <li key={point.label} className="border-t border-sya-navy/15 pt-6">
              <p className="flex items-baseline gap-3">
                <span aria-hidden="true" className="text-xs font-semibold tabular-nums tracking-[0.2em] text-sya-gold-deep">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span lang="en" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sya-navy/55">
                  {point.label}
                </span>
              </p>
              <h3 className="mt-4 break-keep text-xl font-bold leading-snug text-sya-navy">{point.title}</h3>
              <p className="mt-3 break-keep text-sm leading-relaxed text-sya-ink/60 lg:whitespace-pre-line">
                {point.description}
              </p>
            </li>
          ))}
        </ol>

        {/* LOCAL SCHOOL EXPERIENCE: 별도 editorial block (특정 학교명·외부 링크 없음, 제휴로 표현하지 않음)
            모바일: 사진 → 텍스트 세로 / 태블릿·데스크톱: 왼쪽 사진, 오른쪽 텍스트 */}
        <aside
          aria-labelledby="local-school-heading"
          className="mt-14 grid gap-8 rounded-2xl border border-sya-ink/8 bg-sya-soft p-5 sm:p-7 md:grid-cols-12 md:items-center md:gap-10 lg:mt-16 lg:gap-14 lg:p-10"
        >
          {/* 학교 사진: 기존과 같은 4:3 틀 (원본 3:2 사진은 좌우가 조금 잘림) */}
          <figure className="md:col-span-6 lg:col-span-7">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-sya-soft">
              <Image
                src={SCHOOL_IMAGE}
                alt={l.school.imageAlt}
                fill
                sizes="(min-width: 1280px) 640px, (min-width: 768px) 50vw, 100vw"
                className="object-cover object-center"
              />
            </div>
          </figure>

          <div className="md:col-span-6 lg:col-span-5">
            <p lang="en" className="text-[10px] font-semibold uppercase tracking-[0.26em] text-sya-gold-deep">
              {l.school.eyebrow}
            </p>
            <h3 id="local-school-heading" className="mt-3 break-keep text-2xl font-bold tracking-[0.04em] text-sya-navy sm:text-3xl">
              {l.school.title}
            </h3>
            <p lang="en" className="mt-2 font-serif text-lg italic text-sya-navy/70">
              {l.school.tagline}
            </p>
            <span aria-hidden="true" className="mt-6 block h-px w-8 bg-sya-gold/70" />
            <p className="mt-6 break-keep text-sm leading-relaxed text-sya-ink/70 lg:whitespace-pre-line">
              {l.school.description}
            </p>
            <p className="mt-3 break-keep text-xs leading-relaxed text-sya-ink/50">
              {l.school.conditionNote}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
