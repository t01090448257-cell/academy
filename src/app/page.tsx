import { getDictionary } from "@/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/config/i18n";
import ComingSoonSection from "@/components/common/ComingSoonSection";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function AboutPage({ params }: PageProps) {
  const resolvedParams = await params;
  const lang: Locale = isLocale(resolvedParams.lang)
    ? resolvedParams.lang
    : defaultLocale;
  const dict = await getDictionary(lang);

  return <ComingSoonSection lang={lang} dict={dict} navKey="about" />;
}
