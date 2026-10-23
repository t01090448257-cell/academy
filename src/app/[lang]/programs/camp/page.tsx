import { isLocale, defaultLocale, type Locale } from "@/config/i18n";
import { getDictionary } from "@/dictionaries";
import CampProgramsContent from "@/components/programs/CampProgramsContent";

interface PageProps {
  params: Promise<{ lang: string }>;
}

/**
 * CAMP PROGRAMS 카테고리 페이지: /[lang]/programs/camp
 * 언어 목록은 [lang]/layout.tsx의 generateStaticParams를 그대로 사용하므로
 * 7개 언어가 모두 정적으로 생성됩니다. (query parameter를 쓰지 않아 static export에 안전)
 */
export default async function CampProgramsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const lang: Locale = isLocale(resolvedParams.lang) ? resolvedParams.lang : defaultLocale;
  const dict = await getDictionary(lang);

  return <CampProgramsContent lang={lang} dict={dict} />;
}
