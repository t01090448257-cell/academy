// src/lib/bidi.ts
// 아랍어(ar) 같은 RTL 페이지에서 영문 문구가 뒤섞이지 않도록 돕는 도구.
//
// 아직 아랍어 번역이 없어 영문(en)으로 대신 표시되는 문구는, RTL 문단 안에서
// 끝의 마침표·괄호·"+"·"1:1" 같은 기호가 반대편으로 튀어 보일 수 있다.
// 이런 문구를 유니코드 격리 문자(LRI U+2066 … PDI U+2069)로 감싸면
// 문구 내부는 원래 순서(LTR) 그대로 보이고, 정렬은 페이지 방향(RTL)을 따른다.
// 격리 문자는 화면에 보이지 않으며, LTR 언어(ko/en/ja/vi/zh-TW/mn/ru)에는 적용하지 않는다.

const LRI = "⁦";
const PDI = "⁩";

/** 문자열 하나를 LTR로 격리한다. */
export function isolateLtr(text: string): string {
  if (!text || text.startsWith(LRI)) return text;
  return `${LRI}${text}${PDI}`;
}

/** 객체·배열 안의 모든 문자열(및 문자열을 돌려주는 함수)을 LTR로 격리한 사본을 만든다. */
export function isolateLtrDeep<T>(value: T): T {
  if (typeof value === "string") {
    return isolateLtr(value) as T;
  }
  if (typeof value === "function") {
    const fn = value as unknown as (...args: unknown[]) => unknown;
    return ((...args: unknown[]) => {
      const result = fn(...args);
      return typeof result === "string" ? isolateLtr(result) : result;
    }) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => isolateLtrDeep(item)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isolateLtrDeep(item);
    }
    return out as T;
  }
  return value;
}
