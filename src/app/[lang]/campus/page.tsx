import { Suspense } from "react";
import { isLocale, defaultLocale, type Locale } from "@/config/i18n";
import { getCampusDictionary } from "@/dictionaries/campus";
import CampusContent from "@/components/campus/CampusContent";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function CampusPage({ params }: PageProps) {
  const resolvedParams = await params;
  const lang: Locale = isLocale(resolvedParams.lang)
    ? resolvedParams.lang
    : defaultLocale;
  // 필리핀 생활안내 8개 언어 사전 (src/dictionaries/campus/<lang>.json)
  const campusCopy = await getCampusDictionary(lang);

  return (
    <Suspense fallback={null}>
      <CampusContent lang={lang} copy={campusCopy} />
    </Suspense>
  );
}
