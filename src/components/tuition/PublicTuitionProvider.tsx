"use client";

// 홈페이지 공개 교육비 컨텍스트
// [lang]/layout.tsx 가 빌드 시 DB에서 읽은 데이터(loadPublicTuition)를 한 번 넣어 주고,
// 학비표(TuitionSection) · 맞춤견적서(CostCalculator) · 상담 모달(ConsultationModal)이 모두 같은 값을 사용합니다.

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "@/config/i18n";
import type { PublicTuitionData } from "@/lib/publicTuition";

interface PublicTuitionContextValue {
  lang: Locale;
  tuition: PublicTuitionData;
}

const PublicTuitionContext = createContext<PublicTuitionContextValue | null>(null);

export function usePublicTuition(): PublicTuitionContextValue {
  const ctx = useContext(PublicTuitionContext);
  if (!ctx) {
    throw new Error("usePublicTuition()은 PublicTuitionProvider 내부의 클라이언트 컴포넌트에서만 사용할 수 있습니다.");
  }
  return ctx;
}

export default function PublicTuitionProvider({
  lang,
  tuition,
  children,
}: {
  lang: Locale;
  tuition: PublicTuitionData;
  children: ReactNode;
}) {
  return <PublicTuitionContext.Provider value={{ lang, tuition }}>{children}</PublicTuitionContext.Provider>;
}
