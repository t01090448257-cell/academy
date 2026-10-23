// src/config/i18n.ts
// 8개국어 라우팅 및 언어 전환 UI에서 공통으로 사용하는 설정 소스

export const locales = ["ko", "en", "ja", "vi", "zh-TW", "mn", "ru", "ar"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ko";

/**
 * 언어 전환 드롭다운에 표시할 정보
 * - label: 언어 셀렉터에 노출되는 '해당 언어로 표기한' 언어명 (자국어 표기가 사용자에게 가장 친숙함)
 * - englishName: 관리/디버깅용 영문 명칭
 */
export const localeMeta: Record<Locale, { label: string; englishName: string }> = {
  ko: { label: "한국어", englishName: "Korean" },
  en: { label: "English", englishName: "English" },
  ja: { label: "日本語", englishName: "Japanese" },
  vi: { label: "Tiếng Việt", englishName: "Vietnamese" },
  "zh-TW": { label: "繁體中文", englishName: "Traditional Chinese (Taiwan)" },
  mn: { label: "Монгол", englishName: "Mongolian" },
  ru: { label: "Русский", englishName: "Russian" },
  ar: { label: "العربية", englishName: "Arabic" },
};

/**
 * 오른쪽→왼쪽(RTL)으로 표시하는 언어.
 * 여기에 포함된 언어만 <html dir="rtl">이 적용되고, 나머지는 기본 LTR 그대로 둔다.
 */
export const rtlLocales: readonly Locale[] = ["ar"];

export function isRtlLocale(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
