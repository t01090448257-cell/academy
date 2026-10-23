import Link from "next/link";
import type { Locale } from "@/config/i18n";
import type { Dictionary } from "@/types/dictionary";

interface ComingSoonSectionProps {
  lang: Locale;
  dict: Dictionary;
  /** GNB 6대 메뉴 중 이 페이지에 해당하는 키 (제목으로 사용) */
  navKey: keyof Dictionary["nav"];
}

/**
 * about/programs/campus/services/admission/community 6개 하위 페이지가
 * 콘텐츠 준비 전까지 404 대신 보여주는 공통 스켈레톤.
 * 실제 콘텐츠가 준비되면 각 page.tsx에서 이 컴포넌트 대신 전용 섹션으로 교체하면 된다.
 */
export default function ComingSoonSection({
  lang,
  dict,
  navKey,
}: ComingSoonSectionProps) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-5 py-24 text-center sm:px-8">
      <span className="rounded-full bg-sya-navy/[0.06] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-sya-navy">
        {dict.comingSoon.badge}
      </span>

      <h1 className="mt-6 text-3xl font-bold text-sya-navy sm:text-4xl">
        {dict.nav[navKey]}
      </h1>

      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-sya-ink/60 sm:text-base">
        {dict.comingSoon.message}
      </p>

      <Link
        href={`/${lang}`}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-sya-navy px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sya-navy/15 transition-transform hover:-translate-y-0.5"
      >
        {dict.comingSoon.backHome}
      </Link>
    </main>
  );
}
