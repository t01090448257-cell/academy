// src/dictionaries/adhd/index.ts
// ADHD 맞춤형 영어교육(/[lang]/programs/adhd + 메인 소개 카드) 전용 사전 로더.
// campus 전용 사전(src/dictionaries/campus)과 같은 방식으로 기본 dictionary(ko.json 등)와 분리했습니다.
// 서버 컴포넌트(메인 page.tsx, programs/adhd/page.tsx)에서만 호출합니다.

import "server-only";
import type { Locale } from "@/config/i18n";
import type { AdhdDictionary } from "@/types/dictionary";

const adhdDictionaries: Record<Locale, () => Promise<AdhdDictionary>> = {
  ko: () => import("./ko.json").then((mod) => mod.default as AdhdDictionary),
  en: () => import("./en.json").then((mod) => mod.default as AdhdDictionary),
  ja: () => import("./ja.json").then((mod) => mod.default as AdhdDictionary),
  vi: () => import("./vi.json").then((mod) => mod.default as AdhdDictionary),
  "zh-TW": () =>
    import("./zh-TW.json").then((mod) => mod.default as AdhdDictionary),
  mn: () => import("./mn.json").then((mod) => mod.default as AdhdDictionary),
  ru: () => import("./ru.json").then((mod) => mod.default as AdhdDictionary),
  ar: () => import("./ar.json").then((mod) => mod.default as AdhdDictionary),
};

export async function getAdhdDictionary(locale: Locale): Promise<AdhdDictionary> {
  const loader = adhdDictionaries[locale] ?? adhdDictionaries.ko;
  return loader();
}
