import { Suspense } from "react";
import { isLocale, defaultLocale, type Locale } from "@/config/i18n";
import AboutContent from "@/components/about/AboutContent";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function AboutPage({ params }: PageProps) {
  const resolvedParams = await params;
  const lang: Locale = isLocale(resolvedParams.lang)
    ? resolvedParams.lang
    : defaultLocale;

  return (
    <Suspense fallback={null}>
      <AboutContent lang={lang} />
    </Suspense>
  );
}
