"use client";

// 홈페이지 공개 교육비 컨텍스트
// [lang]/layout.tsx 가 빌드 시 DB에서 읽은 데이터(loadPublicTuition)를 한 번 넣어 주고,
// 학비표(TuitionSection) · 맞춤견적서(CostCalculator) · 상담 모달(ConsultationModal)이 모두 같은 값을 사용합니다.
//
// 가격 자동 갱신
// - 화면에 처음 들어왔을 때와 그 뒤 5분마다 GET /api/programs/public-prices 를 다시 조회합니다.
// - 응답이 정상이고 데이터 검증을 통과한 경우에만 가격을 바꿉니다.
//   조회 실패·비정상 응답이면 지금 보이는 가격(처음에는 빌드 시점 가격)을 그대로 유지합니다.
// - API가 없는 배포(예: Netlify Drop 정적 업로드)에서는 조회가 실패하므로 빌드 시점 가격이 그대로 사용됩니다.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Locale } from "@/config/i18n";
import { PROGRAM_COURSE_IDS } from "@/config/programs";
import { MAX_PUBLIC_OPTIONS } from "@/config/programPricing";
import type { PublicDurationPrice, PublicTuitionData } from "@/lib/publicTuition";
import { fetchPublicTuition } from "@/lib/publicProgramPrices";

interface PublicTuitionContextValue {
  lang: Locale;
  tuition: PublicTuitionData;
}

const PublicTuitionContext = createContext<PublicTuitionContextValue | null>(null);

/** 공개 가격 재조회 간격: 5분 */
const REFRESH_INTERVAL_MS = 300_000;

/** 기간 1개: 양의 정수 주수 + 양의 정수 원화 가격 */
function isValidDurationPrice(row: unknown): row is PublicDurationPrice {
  if (!row || typeof row !== "object") return false;
  const { weeks, price } = row as { weeks?: unknown; price?: unknown };
  return (
    typeof weeks === "number" &&
    Number.isInteger(weeks) &&
    weeks > 0 &&
    typeof price === "number" &&
    Number.isSafeInteger(price) &&
    price > 0
  );
}

/**
 * API 응답 검증 — 빌드 시 loadPublicTuition() 결과와 같은 구조인지 확인합니다.
 * date: YYYY-MM-DD / courses: 5개 과정 모두 배열, 과정별 최대 MAX_PUBLIC_OPTIONS개, 같은 주수 중복 없음
 * (기간이 0개인 과정은 정상 — 화면에서 "상담 시 안내"로 표시)
 */
function isValidPublicTuition(data: PublicTuitionData | null): data is PublicTuitionData {
  if (!data || typeof data.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return false;
  if (!data.courses || typeof data.courses !== "object") return false;
  return PROGRAM_COURSE_IDS.every((id) => {
    const rows: unknown = data.courses[id];
    if (!Array.isArray(rows) || rows.length > MAX_PUBLIC_OPTIONS) return false;
    if (!rows.every(isValidDurationPrice)) return false;
    return new Set(rows.map((row) => row.weeks)).size === rows.length;
  });
}

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
  // API에서 받은 최신 가격 (검증 통과한 값만). 아직 없으면 빌드 시점 가격(tuition)을 사용합니다.
  const [latestTuition, setLatestTuition] = useState<PublicTuitionData | null>(null);

  useEffect(() => {
    let active = true; // 해제된 뒤 도착한 응답은 반영하지 않음
    let requestSeq = 0; // 늦게 도착한 이전 요청의 응답이 최신 응답을 덮어쓰지 않도록

    async function refresh() {
      const seq = ++requestSeq;
      const data = await fetchPublicTuition(); // 실패·비정상 응답이면 null (예외를 던지지 않음)
      if (!active || seq !== requestSeq) return;
      if (isValidPublicTuition(data)) setLatestTuition(data);
      // 실패하거나 검증을 통과하지 못하면 아무것도 바꾸지 않음 → 기존 가격 유지
    }

    void refresh(); // 최초 진입 시 조회
    const timer = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const currentTuition = latestTuition ?? tuition;
  const value = useMemo(() => ({ lang, tuition: currentTuition }), [lang, currentTuition]);

  return <PublicTuitionContext.Provider value={value}>{children}</PublicTuitionContext.Provider>;
}
