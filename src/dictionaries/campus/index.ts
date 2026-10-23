// src/dictionaries/campus/index.ts
// 필리핀 생활안내(/[lang]/campus) 전용 사전 로더.
// 문구 분량이 커서 기본 dictionary(ko.json 등)와 분리했고, campus 페이지(서버 컴포넌트)에서만 호출한다.

import "server-only";
import type { Locale } from "@/config/i18n";
import type { CampusDictionary } from "@/types/dictionary";

const campusDictionaries: Record<Locale, () => Promise<CampusDictionary>> = {
  ko: () => import("./ko.json").then((mod) => mod.default as CampusDictionary),
  en: () => import("./en.json").then((mod) => mod.default as CampusDictionary),
  ja: () => import("./ja.json").then((mod) => mod.default as CampusDictionary),
  vi: () => import("./vi.json").then((mod) => mod.default as CampusDictionary),
  "zh-TW": () =>
    import("./zh-TW.json").then((mod) => mod.default as CampusDictionary),
  mn: () => import("./mn.json").then((mod) => mod.default as CampusDictionary),
  ru: () => import("./ru.json").then((mod) => mod.default as CampusDictionary),
  ar: () => import("./ar.json").then((mod) => mod.default as CampusDictionary),
};

export async function getCampusDictionary(locale: Locale): Promise<CampusDictionary> {
  const loader = campusDictionaries[locale] ?? campusDictionaries.ko;
  return loader();
}
