// src/lib/adminReturnUrl.ts
// 로그인 후 돌아갈 주소(returnUrl) 검사 — 오픈 리다이렉트 방지
//
// 허용: 같은 사이트의 관리자 페이지 경로만
//   /admin, /admin/students, /admin/students/new, /admin/students/123, /admin/students?q=...&status=...
// 거부: https://example.com, //example.com, /\example.com, javascript:..., 제어문자 포함,
//       /admin 밖의 경로(/ko 등), ../ 로 관리자 영역을 벗어나는 경로, 로그인 페이지 자체
// 거부되면 null을 돌려주고, 호출하는 쪽은 기존처럼 /admin으로 이동합니다.

export const ADMIN_HOME = "/admin";
export const ADMIN_LOGIN_PATH = "/admin/login";
const MAX_LENGTH = 2000;

export function getSafeAdminReturnUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || value.length > MAX_LENGTH) return null;

  // 반드시 "/"로 시작하는 상대 경로. "//", 역슬래시(브라우저가 "/"로 바꿔 해석), 제어문자는 거부
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  if (/[\u0000-\u001F\u007F]/.test(value)) return null;

  // 임의의 기준 주소로 해석해 정규화한 뒤, 같은 출처이고 /admin 영역인지 다시 확인
  const base = "http://sya-admin.invalid";
  let parsed: URL;
  try {
    parsed = new URL(value, base);
  } catch {
    return null;
  }
  if (parsed.origin !== base) return null;

  const path = parsed.pathname;
  const isAdminPath = path === ADMIN_HOME || path.startsWith(`${ADMIN_HOME}/`);
  if (!isAdminPath) return null;

  // 로그인 페이지로 되돌아가는 반복 방지
  if (path === ADMIN_LOGIN_PATH || path.startsWith(`${ADMIN_LOGIN_PATH}/`)) return null;

  return `${path}${parsed.search}${parsed.hash}`;
}

/** /admin/login?returnUrl=... 주소 만들기 (돌아갈 주소가 안전하지 않으면 returnUrl 없이) */
export function buildAdminLoginUrl(returnUrl: string | null | undefined): string {
  const safe = getSafeAdminReturnUrl(returnUrl);
  if (!safe || safe === ADMIN_HOME) return ADMIN_LOGIN_PATH;
  return `${ADMIN_LOGIN_PATH}?returnUrl=${encodeURIComponent(safe)}`;
}
