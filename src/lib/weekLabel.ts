// src/lib/weekLabel.ts
// 기간(주수) 표시 문구. 주수는 관리자가 자유롭게 입력하므로(예: 6주, 10주) 코드에 고정 목록을 두지 않습니다.
// - dictionary(dict.tuition.weeks)에 해당 주수 문구가 있으면 그대로 사용 (기존 번역 유지: 예 ar "أسبوعان")
// - 없으면 언어별 규칙으로 만듭니다. (러시아어·아랍어는 복수형 규칙 적용)

import type { Locale } from "@/config/i18n";

type WeekForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

/** {n} 자리에 숫자가 들어갑니다 */
const WEEK_FORMS: Record<Locale, WeekForms> = {
  ko: { other: "{n}주" },
  en: { one: "{n} week", other: "{n} weeks" },
  ja: { other: "{n}週間" },
  vi: { other: "{n} tuần" },
  "zh-TW": { other: "{n}週" },
  mn: { other: "{n} долоо хоног" },
  ru: { one: "{n} неделя", few: "{n} недели", many: "{n} недель", other: "{n} недели" },
  ar: { one: "أسبوع واحد", two: "أسبوعان", few: "{n} أسابيع", many: "{n} أسبوعًا", other: "{n} أسبوع" },
};

export function formatWeeks(lang: Locale, weeks: number, dictWeeks?: Partial<Record<string, string>>): string {
  const fromDict = dictWeeks?.[String(weeks)];
  if (fromDict) return fromDict;

  const forms = WEEK_FORMS[lang] ?? WEEK_FORMS.en;
  let category: Intl.LDMLPluralRule = "other";
  try {
    category = new Intl.PluralRules(lang).select(weeks);
  } catch {
    category = "other";
  }
  return (forms[category] ?? forms.other).replace("{n}", String(weeks));
}
