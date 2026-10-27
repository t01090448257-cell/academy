import type { Metadata } from "next";
import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import ConsultationModalProvider from "@/components/common/ConsultationModalProvider";
import PublicTuitionProvider from "@/components/tuition/PublicTuitionProvider";
import SiteContactProvider from "@/components/common/SiteContactProvider";
import { getDictionary } from "@/dictionaries";
import { loadPublicTuition } from "@/lib/publicTuition.server";
import { loadPublicSiteContact } from "@/lib/siteContact.server";
import {
  isLocale,
  isRtlLocale,
  locales,
  defaultLocale,
  type Locale,
} from "@/config/i18n";

interface LangLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LangLayoutProps): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = isLocale(resolvedParams.lang)
    ? resolvedParams.lang
    : defaultLocale;

  const dict = await getDictionary(lang);

  return {
    title: {
      default: `${dict.meta.siteName} | ${dict.meta.siteNameFull}`,
      template: `%s | ${dict.meta.siteName}`,
    },
    description: dict.hero.sloganSub,
    alternates: {
      languages: Object.fromEntries(
        locales.map((l) => [l, `/${l}`])
      ),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LangLayoutProps) {
  const resolvedParams = await params;

  const lang: Locale = isLocale(resolvedParams.lang)
    ? resolvedParams.lang
    : defaultLocale;

  const dict = await getDictionary(lang);
  // 홈페이지 교육비: 관리자 DB의 현재 적용 가격 (정적 배포에서는 빌드 시점 값)
  const tuition = await loadPublicTuition();
  // 홈페이지 연락처: 관리자 설정 > 학원 기본정보 (조회 실패 시 기존 기본값, 브라우저에서 5분마다 재조회)
  const siteContact = await loadPublicSiteContact();

  return (
    <div
      lang={lang}
      dir={isRtlLocale(lang) ? "rtl" : undefined}
      className="bg-slate-50 text-slate-900 antialiased flex flex-col min-h-screen"
    >
      <PublicTuitionProvider lang={lang} tuition={tuition}>
        <ConsultationModalProvider lang={lang} dict={dict}>
          <SiteContactProvider contact={siteContact}>
            <Header lang={lang} dict={dict} />

            <main className="flex-grow">{children}</main>

            <Footer lang={lang} />
          </SiteContactProvider>
        </ConsultationModalProvider>
      </PublicTuitionProvider>
    </div>
  );
}