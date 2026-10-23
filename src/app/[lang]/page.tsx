import { Suspense } from "react";
import CostCalculator from "@/components/calculator/CostCalculator";
import HeroSection from "@/components/home/HeroSection";
import WhySyaSection from "@/components/home/WhySyaSection";
import LiveLearnSection from "@/components/home/LiveLearnSection";
import ProgramsSection from "@/components/home/ProgramsSection";
import AdhdProgramIntro from "@/components/home/AdhdProgramIntro";
import TuitionSection from "@/components/tuition/TuitionSection";
import AccommodationSection from "@/components/home/AccommodationSection";
import { HOME_SECTION_Y } from "@/components/home/sectionSpacing";
import { getDictionary } from "@/dictionaries";
import { getAdhdDictionary } from "@/dictionaries/adhd";
import { isLocale, defaultLocale, type Locale } from "@/config/i18n";

type Props = { params: Promise<{ lang: string }> | { lang: string } };

export default async function HomePage({ params }: Props) {
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  const lang: Locale = isLocale(resolvedParams?.lang) ? resolvedParams.lang : defaultLocale;
  const dict = await getDictionary(lang);
  const adhd = await getAdhdDictionary(lang);

  return (
    <div className="w-full bg-slate-50 antialiased scroll-smooth">
      {/* 1. 히어로 섹션 (AI스튜디오 디자인 이식, 상담신청 버튼은 전역 모달을 엽니다) */}
      <HeroSection lang={lang} dict={dict} calculatorHref="#calculator" />

      {/* 2. Why SYA 섹션 */}
      <WhySyaSection dict={dict} />

      {/* 2-1. LIVE & LEARN IN CEBU (WHY SYA? 와 Programs 사이) */}
      <LiveLearnSection dict={dict} />

      {/* 3. 프로그램 섹션 (정규반 3 / 캠프반 2) */}
      <ProgramsSection lang={lang} dict={dict} />

      {/* 3-1. ADHD 맞춤형 영어교육 소개 카드 (OUR PROGRAMS 아래, 같은 배경으로 이어짐 → /[lang]/programs/adhd) */}
      <AdhdProgramIntro lang={lang} adhd={adhd} />

      {/* 4. Tuition (학비 안내 + 예상 비용 계산기). Hero의 "연수 비용 알아보기"(#calculator)가 이 섹션으로 연결됩니다. */}
      <section id="calculator" aria-labelledby="tuition-heading" className="scroll-mt-20 border-t border-sya-ink/6 bg-sya-soft">
        <div className={`mx-auto max-w-7xl px-6 sm:px-8 ${HOME_SECTION_Y}`}>
          <TuitionSection dict={dict} calculatorHref="#cost-calculator" />

          <div id="cost-calculator" className="mt-16 scroll-mt-24 rounded-3xl border border-sya-ink/8 bg-white p-6 sm:p-8 lg:p-10">
            <div className="mb-8 max-w-xl">
              <h3 className="text-2xl font-bold tracking-tight text-sya-navy">{dict.estimator.title}</h3>
              <p className="mt-2 break-keep text-sm text-sya-ink/60">{dict.estimator.subtitle}</p>
            </div>
            <Suspense fallback={null}>
              <CostCalculator lang={lang} dict={dict} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* 5. Accommodation (BE Pods Lahug 우선 숙소 + Noble Hotel 추가 숙소 안내) */}
      <AccommodationSection dict={dict} />
    </div>
  );
}
