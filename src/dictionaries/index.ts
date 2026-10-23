// src/dictionaries/index.ts
// 서버 컴포넌트(layout.tsx, page.tsx)에서 호출.
// 언어별로 동적 import 하여 필요한 번역 파일만 번들에 포함시킴.

import "server-only";
import type { Locale } from "@/config/i18n";
import type { Dictionary } from "@/types/dictionary";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  ko: () => import("./ko.json").then((mod) => mod.default as Dictionary),
  en: () => import("./en.json").then((mod) => mod.default as Dictionary),
  ja: () => import("./ja.json").then((mod) => mod.default as Dictionary),
  vi: () => import("./vi.json").then((mod) => mod.default as Dictionary),
  "zh-TW": () =>
    import("./zh-TW.json").then((mod) => mod.default as Dictionary),
  mn: () => import("./mn.json").then((mod) => mod.default as Dictionary),
  ru: () => import("./ru.json").then((mod) => mod.default as Dictionary),
  ar: () => import("./ar.json").then((mod) => mod.default as Dictionary),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const loader = dictionaries[locale] ?? dictionaries.ko;
  return loader();
}
