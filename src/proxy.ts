import { NextResponse, type NextRequest } from "next/server";
import { locales, defaultLocale, type Locale } from "@/config/i18n";
import { verifySession } from "@/lib/auth";

/**
 * 브라우저의 Accept-Language 헤더를 파싱해 가장 적합한 로케일을 고른다.
 *
 * 매칭 우선순위:
 *   1) 정확히 일치
 *   2) 언어 베이스만 일치
 *   3) 중국어 계열은 zh-TW로 통일
 *   4) 찾지 못하면 defaultLocale
 */
function detectLocaleFromHeader(
  acceptLanguage: string | null
): Locale {
  if (!acceptLanguage) return defaultLocale;

  const parsedLangs = acceptLanguage
    .split(",")
    .map((part) => {
      const [rawCode, qPart] = part.trim().split(";q=");
      const q = qPart ? parseFloat(qPart) : 1;

      return {
        code: rawCode.trim().toLowerCase(),
        q: Number.isNaN(q) ? 1 : q,
      };
    })
    .sort((a, b) => b.q - a.q);

  const localesLower = locales.map((l) => l.toLowerCase());

  for (const { code } of parsedLangs) {
    // 1) 정확히 일치
    const exactIndex = localesLower.indexOf(code);

    if (exactIndex !== -1) {
      return locales[exactIndex];
    }

    const base = code.split("-")[0];

    // 2) 중국어 계열은 zh-TW로 통일
    if (base === "zh") {
      return "zh-TW";
    }

    // 3) 언어 베이스만 일치
    const baseIndex = localesLower.findIndex(
      (l) => l.split("-")[0] === base
    );

    if (baseIndex !== -1) {
      return locales[baseIndex];
    }
  }

  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * ==========================================
   * 관리자 영역
   * ==========================================
   *
   * /admin/login 은 로그인 페이지이므로
   * 로그인하지 않아도 접근할 수 있도록 허용합니다.
   */
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  /*
   * /admin 또는 /admin/* 접근 시
   * 관리자 세션을 확인합니다.
   */
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const token = request.cookies.get("sya_admin_session")?.value;

    if (!token) {
      return NextResponse.redirect(
        new URL("/admin/login", request.url)
      );
    }

    const session = await verifySession(token);

    if (!session) {
      const response = NextResponse.redirect(
        new URL("/admin/login", request.url)
      );

      // 유효하지 않은 세션 쿠키도 정리
      response.cookies.set({
        name: "sya_admin_session",
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });

      return response;
    }

    // 정상적인 관리자 세션
    return NextResponse.next();
  }

  /*
   * ==========================================
   * 일반 홈페이지 다국어 처리
   * ==========================================
   */

  // 이미 /ko, /en 등 로케일이 붙어있으면 그대로 통과
  const pathnameHasLocale = locales.some(
    (locale) =>
      pathname === `/${locale}` ||
      pathname.startsWith(`/${locale}/`)
  );

  if (pathnameHasLocale) {
    return NextResponse.next();
  }

  const detectedLocale = detectLocaleFromHeader(
    request.headers.get("accept-language")
  );

  const redirectUrl = new URL(
    `/${detectedLocale}${
      pathname === "/" ? "" : pathname
    }${request.nextUrl.search}`,
    request.url
  );

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    // _next, api, favicon, 확장자가 있는 정적 파일 제외
    "/((?!_next|api|favicon.ico|.*\\..*).*)",
  ],
};