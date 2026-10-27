// src/lib/siteContact.ts
// ─────────────────────────────────────────────────────────────────────
// 홈페이지 공개 연락처·주소 (Footer · 상담 카드 · 학원소개 「오시는 길」이 함께 사용)
//
// 데이터 흐름
//   관리자 > 관리자 설정 > 학원 기본정보 (app_settings, id = 1)
//     → 빌드 시 loadPublicSiteContact() (src/lib/siteContact.server.ts) → [lang]/layout.tsx 의 SiteContactProvider
//     → 브라우저에서 GET /api/public/site-contact 를 최초 진입 시 + 5분마다 재조회
//
// 이 파일은 DB를 읽지 않는 순수 함수·타입만 둡니다. (브라우저 번들에 포함되어도 안전)
//
// 규칙
//   - DB 값이 NULL 또는 빈 문자열이면 항목별로 아래 기본값(기존 홈페이지 표시값)을 사용합니다.
//   - 공개 API는 DB 값을 그대로(빈 값은 null) 돌려주고, 기본값 대체는 화면 쪽(resolveSiteContact)에서만 합니다.
// ─────────────────────────────────────────────────────────────────────

/** 공개 API 응답의 연락처 (DB 값 그대로, 비어 있으면 null) */
export interface PublicSiteContactRaw {
  koreaPhone: string | null;
  localPhone: string | null;
  email: string | null;
  campusAddress: string | null;
  koreaOfficeAddress: string | null;
  philippinesOfficeAddress: string | null;
}

/** 화면에서 사용하는 연락처 (빈 항목은 기본값으로 채운 상태) */
export type SiteContact = { [K in keyof PublicSiteContactRaw]: string };

export const SITE_CONTACT_KEYS = [
  "koreaPhone",
  "localPhone",
  "email",
  "campusAddress",
  "koreaOfficeAddress",
  "philippinesOfficeAddress",
] as const satisfies readonly (keyof PublicSiteContactRaw)[];

/** 기존 홈페이지에 하드코딩되어 있던 값 (DB 값이 비어 있거나 조회에 실패하면 사용) */
export const SITE_CONTACT_DEFAULTS: SiteContact = {
  koreaPhone: "02-2588-7104",
  localPhone: "+63-32-416-1227",
  email: "admissions@sya-academy.com",
  campusAddress: "SYA Campus, A.S. Fortuna St, Banilad, Mandaue City, Cebu, Philippines",
  koreaOfficeAddress: "서울특별시 서초구 강남대로 381 두산베어스텔 1204호",
  philippinesOfficeAddress: "Gov. M. Cuenco Ave, Kasambagan, Cebu City 6000, Philippines (The Noble Cebu)",
};

/** 입력·표시 길이 상한 (관리자 저장 검증과 같은 값) */
export const SITE_CONTACT_LIMITS = {
  phone: 50,
  email: 255,
  address: 300,
} as const;

/** 전화번호 허용 문자: 숫자 · + · - · 공백 · 괄호 · 마침표 */
export const PHONE_ALLOWED_RE = /^[0-9+\-\s().]+$/;

/** 전화번호 형식: 허용 문자만, 숫자 7~15자리, 50자 이하 */
export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return (
    value.length <= SITE_CONTACT_LIMITS.phone &&
    PHONE_ALLOWED_RE.test(value) &&
    digits.length >= 7 &&
    digits.length <= 15
  );
}

/** 공개 API 응답 검증: 6개 항목이 모두 있고, 각각 null 또는 길이 제한 안의 문자열 */
export function isValidSiteContactRaw(value: unknown): value is PublicSiteContactRaw {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return SITE_CONTACT_KEYS.every((key) => {
    const item = record[key];
    if (item === null) return true;
    if (typeof item !== "string") return false;
    const limit =
      key === "koreaPhone" || key === "localPhone"
        ? SITE_CONTACT_LIMITS.phone
        : key === "email"
          ? SITE_CONTACT_LIMITS.email
          : SITE_CONTACT_LIMITS.address;
    return item.length <= limit;
  });
}

/** DB 값(빈 값은 null) → 화면 값. 항목별로 비어 있으면 기본값 */
export function resolveSiteContact(raw: Partial<PublicSiteContactRaw> | null | undefined): SiteContact {
  const result = { ...SITE_CONTACT_DEFAULTS };
  if (!raw) return result;
  for (const key of SITE_CONTACT_KEYS) {
    const item = raw[key];
    if (typeof item === "string" && item.trim()) result[key] = item.trim();
  }
  return result;
}

/** 전화 앱 링크: 숫자와 맨 앞의 + 만 남김 (예: "02-2588-7104" → "tel:0225887104", "+63-32-416-1227" → "tel:+63324161227") */
export function toTelHref(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}

/** 메일 앱 링크 */
export function toMailtoHref(email: string): string {
  return `mailto:${email.trim()}`;
}

/** 지도 기본 검색어 (기존 학원소개 지도와 같은 위치) */
export const DEFAULT_MAP_QUERY = "The Noble Cebu, Gov. M. Cuenco Ave, Kasambagan, Cebu City, Philippines";

/**
 * Google 지도 임베드 주소 — 필리핀 사무소 주소 기준 (캠퍼스 주소는 사용하지 않음)
 * 주소가 비어 있거나 너무 길거나 기본값과 같으면 기존 지도 위치(검색어)를 그대로 사용합니다.
 */
export function officeMapEmbedSrc(officeAddress: string | null | undefined): string {
  const address = (officeAddress ?? "").trim();
  const useDefault =
    !address ||
    address.length > SITE_CONTACT_LIMITS.address ||
    address === SITE_CONTACT_DEFAULTS.philippinesOfficeAddress;
  const query = useDefault ? DEFAULT_MAP_QUERY : address;
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}
