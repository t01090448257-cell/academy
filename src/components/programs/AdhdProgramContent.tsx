import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import type { Locale } from "@/config/i18n";
import type { AdhdDictionary, Dictionary } from "@/types/dictionary";
import type { ConsultationPrefill } from "@/components/common/ConsultationModalProvider";
import { HOME_SECTION_Y } from "@/components/home/sectionSpacing";
import ConsultButton from "@/components/common/ConsultButton";

interface AdhdProgramContentProps {
  lang: Locale;
  dict: Dictionary;
  adhd: AdhdDictionary;
}

/* 버튼 스타일: RegularProgramsContent.tsx와 같은 값 (기존 파일은 수정하지 않고 동일하게 사용) */
const LIGHT_BUTTON =
  "group inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-sya-navy transition-colors hover:bg-sya-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

const ARROW_CLASS =
  "h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5";

/** 수업 형태 카드 이미지 (기존 SYA 이미지 에셋 재사용) */
const FORMAT_IMAGES = ["/images/sya-photos/ielts-prep.png", "/images/sya-photos/junior-family.png"] as const;

function Eyebrow({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <p
      lang="en"
      className={`flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] ${
        light ? "text-sya-gold" : "text-sya-gold-deep"
      }`}
    >
      <span aria-hidden="true" className="h-px w-8 bg-sya-gold/70" />
      {children}
    </p>
  );
}

function SectionTitle({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <h2 id={id} className="max-w-2xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <span className="mt-5 block break-keep wrap-anywhere text-3xl font-bold leading-tight tracking-tight text-sya-navy sm:text-4xl">
        {title}
      </span>
    </h2>
  );
}

function StepNumber({ index }: { index: number }) {
  return (
    <span aria-hidden="true" className="text-xs font-semibold tabular-nums tracking-[0.2em] text-sya-gold-deep">
      {String(index + 1).padStart(2, "0")}
    </span>
  );
}

/**
 * ADHD 맞춤형 영어교육 상세 페이지 (/[lang]/programs/adhd)
 * - 디자인은 REGULAR / CAMP 카테고리 페이지와 같은 컬러 토큰·여백·버튼을 사용합니다.
 * - 상담 버튼은 기존 상담 팝업을 열고, topic: "adhd"를 넘겨 ADHD 상담으로 표시·식별되게 합니다.
 *   (기존 정규반·캠프에서 여는 팝업은 topic을 넘기지 않으므로 기존 동작 그대로)
 */
export default function AdhdProgramContent({ lang, dict, adhd }: AdhdProgramContentProps) {
  const page = adhd.page;
  const consultPrefill: ConsultationPrefill = {
    topic: { id: "adhd", ...adhd.consultation },
  };
  const showEnglishTitle = page.hero.title.trim() !== page.hero.englishTitle.trim();

  return (
    <div>
      {/* ── A. HERO ── */}
      <section aria-labelledby="adhd-hero-heading" className="bg-sya-navy text-white">
        <div className="mx-auto max-w-7xl px-6 pb-14 pt-8 sm:px-8 sm:pb-20 lg:pb-20 lg:pt-9">
          <nav aria-label="Breadcrumb" className="text-[11px] font-medium text-white/50 sm:text-xs">
            <Link href={`/${lang}`} className="hover:text-white">
              {dict.programs.detail.breadcrumbHome}
            </Link>
            <span aria-hidden="true" className="mx-1.5">›</span>
            <Link href={`/${lang}/programs`} className="hover:text-white">
              {dict.programs.detail.pageTitle}
            </Link>
            <span aria-hidden="true" className="mx-1.5">›</span>
            <span aria-current="page" className="font-semibold text-sya-gold">
              {page.breadcrumbCurrent}
            </span>
          </nav>

          <div className="mt-10 max-w-3xl lg:mt-9">
            <Eyebrow light>Specialized Program</Eyebrow>
            <h1
              id="adhd-hero-heading"
              className="mt-6 break-keep wrap-anywhere text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-[3.2rem]"
            >
              {page.hero.title}
            </h1>
            {showEnglishTitle && (
              <p lang="en" className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-white/55">
                {page.hero.englishTitle}
              </p>
            )}
            <p className="mt-8 max-w-2xl break-keep wrap-anywhere text-xl font-semibold leading-snug text-white sm:text-2xl">
              {page.hero.copy}
            </p>
            <p className="mt-5 max-w-2xl break-keep wrap-anywhere text-[15px] leading-relaxed text-white/75 sm:text-base">
              {page.hero.description}
            </p>
            <ConsultButton prefill={consultPrefill} className={`mt-9 ${LIGHT_BUTTON}`}>
              <span>{page.hero.cta}</span>
              <ArrowRight aria-hidden="true" className={ARROW_CLASS} />
            </ConsultButton>
          </div>
        </div>
      </section>

      {/* ── B. 교육 방향 ── */}
      <section aria-labelledby="adhd-approach-heading" className="bg-sya-sky">
        <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
          <SectionTitle id="adhd-approach-heading" eyebrow="Our Approach" title={page.approach.title} />
          <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4 lg:gap-8">
            {page.approach.items.map((item, index) => (
              <li key={item.title} className="border-t border-sya-navy/20 pt-5">
                <StepNumber index={index} />
                <h3 className="mt-3 break-keep wrap-anywhere text-lg font-bold tracking-tight text-sya-navy sm:text-xl">{item.title}</h3>
                <p className="mt-3 break-keep wrap-anywhere text-sm leading-relaxed text-sya-ink/65 sm:text-[15px]">{item.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── C. 수업 형태 ── */}
      <section aria-labelledby="adhd-formats-heading" className="border-t border-sya-ink/6 bg-white">
        <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
          <SectionTitle id="adhd-formats-heading" eyebrow="Class Formats" title={page.formats.title} />
          <ul className="mt-12 grid gap-14 md:grid-cols-2 md:gap-8 lg:mt-14 lg:gap-10">
            {page.formats.items.map((item, index) => (
              <li key={item.title}>
                <article aria-labelledby={`adhd-format-${index}`} className="flex h-full flex-col">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-sya-sky">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={FORMAT_IMAGES[index] ?? FORMAT_IMAGES[0]}
                      alt={item.imageAlt}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover saturate-[0.92]"
                    />
                  </div>
                  <p className="mt-7">
                    <StepNumber index={index} />
                  </p>
                  <h3
                    id={`adhd-format-${index}`}
                    className="mt-2 break-keep wrap-anywhere text-2xl font-bold tracking-tight text-sya-navy sm:text-[1.75rem]"
                  >
                    {item.title}
                  </h3>
                  <ul className="mt-5 space-y-3 border-t border-sya-ink/10 pt-5">
                    {item.points.map((point) => (
                      <li key={point} className="flex items-start gap-3 text-sm text-sya-ink/75 sm:text-[15px]">
                        <span aria-hidden="true" className="mt-[0.5rem] h-1.5 w-1.5 shrink-0 rounded-full bg-sya-gold" />
                        <span className="break-keep wrap-anywhere">{point}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </li>
            ))}
          </ul>
          <p className="mt-10 break-keep wrap-anywhere text-sm text-sya-ink/55">{page.formats.note}</p>
        </div>
      </section>

      {/* ── D. 대상 학생 ── */}
      <section aria-labelledby="adhd-audience-heading" className="bg-sya-soft">
        <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <SectionTitle id="adhd-audience-heading" eyebrow="Who It's For" title={page.audience.title} />
            </div>
            <div className="lg:col-span-6 lg:col-start-7 lg:pt-10">
              <p className="break-keep wrap-anywhere text-base leading-relaxed text-sya-navy sm:text-lg">{page.audience.description}</p>
              <p className="mt-6 break-keep wrap-anywhere border-s-2 border-sya-gold/70 ps-5 text-sm leading-relaxed text-sya-ink/65 sm:text-[15px]">
                {page.audience.note}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── E. 수업 진행 과정 ── */}
      <section aria-labelledby="adhd-process-heading" className="bg-white">
        <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
          <SectionTitle id="adhd-process-heading" eyebrow="How It Works" title={page.process.title} />
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4 lg:gap-0">
            {page.process.steps.map((step, index) => (
              <li key={step} className="border-t border-sya-navy/20 pt-5 lg:pe-6">
                <StepNumber index={index} />
                <p className="mt-3 flex items-start gap-3 break-keep wrap-anywhere text-base font-bold leading-snug text-sya-navy sm:text-lg">
                  <span>{step}</span>
                  {index < page.process.steps.length - 1 && (
                    <ArrowRight aria-hidden="true" className="mt-1 hidden h-4 w-4 shrink-0 text-sya-gold lg:block rtl:-scale-x-100" />
                  )}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── F. FAQ (details/summary: 키보드로 열고 닫기 가능, JS 불필요) ── */}
      <section aria-labelledby="adhd-faq-heading" className="border-t border-sya-ink/6 bg-sya-sky">
        <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <SectionTitle id="adhd-faq-heading" eyebrow="FAQ" title={page.faq.title} />
            </div>
            <div className="divide-y divide-sya-ink/10 border-y border-sya-ink/10 lg:col-span-8">
              {page.faq.items.map((item) => (
                <details key={item.question} className="group">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sya-navy [&::-webkit-details-marker]:hidden">
                    <h3 className="break-keep wrap-anywhere text-base font-semibold text-sya-navy sm:text-[17px]">{item.question}</h3>
                    <Plus
                      aria-hidden="true"
                      className="mt-0.5 h-5 w-5 shrink-0 text-sya-gold-deep transition-transform group-open:rotate-45"
                    />
                  </summary>
                  <p className="break-keep wrap-anywhere pb-6 pe-10 text-sm leading-relaxed text-sya-ink/70 sm:text-[15px]">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── G. 상담 연결 ── */}
      <section aria-labelledby="adhd-cta-heading" className="bg-sya-navy text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 sm:py-20">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
            <div className="max-w-2xl">
              <h2 id="adhd-cta-heading" className="break-keep wrap-anywhere text-2xl font-bold tracking-tight sm:text-3xl">
                {page.cta.title}
              </h2>
              <p className="mt-4 break-keep wrap-anywhere text-[15px] leading-relaxed text-white/75">{page.cta.description}</p>
            </div>
            <ConsultButton prefill={consultPrefill} className={`shrink-0 ${LIGHT_BUTTON}`}>
              <span>{page.cta.button}</span>
              <ArrowRight aria-hidden="true" className={ARROW_CLASS} />
            </ConsultButton>
          </div>
          <p className="mt-12 break-keep wrap-anywhere border-t border-white/15 pt-6 text-xs leading-relaxed text-white/55">
            {page.disclaimer}
          </p>
        </div>
      </section>
    </div>
  );
}
