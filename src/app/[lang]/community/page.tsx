import type { Metadata } from "next";
import { Suspense } from "react";
import CommunityContent from "@/components/community/CommunityContent";
import { isLocale, defaultLocale, type Locale } from "@/config/i18n";

type Props = { params: Promise<{ lang: string }> | { lang: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  const lang: Locale = isLocale(resolvedParams?.lang) ? resolvedParams.lang : defaultLocale;
  return {
    title: lang === "ko" ? "커뮤니티 | SYA" : "Community | SYA",
  };
}

export default async function CommunityPage({ params }: Props) {
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  const lang: Locale = isLocale(resolvedParams?.lang) ? resolvedParams.lang : defaultLocale;

  return (
    <Suspense fallback={null}>
      <CommunityContent lang={lang} />
    </Suspense>
  );
}
