import type { Metadata } from "next";
import { isLocale, defaultLocale, type Locale } from "@/config/i18n";
import { getDictionary } from "@/dictionaries";
import { getAdhdDictionary } from "@/dictionaries/adhd";
import AdhdProgramContent from "@/components/programs/AdhdProgramContent";

interface PageProps {
  params: Promise<{ lang: string }>;
}

async function resolveLang(params: PageProps["params"]): Promise<Locale> {
  const resolvedParams = await params;
  return isLocale(resolvedParams.lang) ? resolvedParams.lang : defaultLocale;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const lang = await resolveLang(params);
  const adhd = await getAdhdDictionary(lang);
  return {
    title: adhd.meta.title,
    description: adhd.meta.description,
  };
}

/**
 * ADHD 맞춤형 영어교육 상세 페이지: /[lang]/programs/adhd
 * 언어 목록은 [lang]/layout.tsx의 generateStaticParams를 그대로 사용하므로
 * 8개 언어가 모두 정적으로 생성됩니다. (query parameter를 쓰지 않아 static export에 안전)
 */
export default async function AdhdProgramPage({ params }: PageProps) {
  const lang = await resolveLang(params);
  const [dict, adhd] = await Promise.all([getDictionary(lang), getAdhdDictionary(lang)]);

  return <AdhdProgramContent lang={lang} dict={dict} adhd={adhd} />;
}
