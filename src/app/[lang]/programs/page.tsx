import { Suspense } from "react";
import { isLocale, defaultLocale, type Locale } from "@/config/i18n";
import { getDictionary } from "@/dictionaries";
import ProgramsContent from "@/components/programs/ProgramsContent";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function ProgramsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const lang: Locale = isLocale(resolvedParams.lang)
    ? resolvedParams.lang
    : defaultLocale;
  const dict = await getDictionary(lang);

  return (
    <Suspense fallback={null}>
      <ProgramsContent lang={lang} dict={dict} />
    </Suspense>
  );
}
