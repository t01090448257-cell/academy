"use client";

// 홈페이지 공개 연락처 컨텍스트 (Footer · 상담 카드 · 학원소개 「오시는 길」 공용)
// [lang]/layout.tsx 가 빌드 시 DB에서 읽은 값(loadPublicSiteContact)을 초기값으로 넣어 주고,
// 브라우저에서는 최초 진입 시와 5분마다 GET /api/public/site-contact 를 다시 조회합니다.
// - 응답이 정상이고 검증을 통과한 경우에만 값을 바꿉니다. (빈 항목은 기존 홈페이지 기본값으로 채움)
// - 조회 실패·비정상 응답이면 마지막 정상 값을 그대로 유지합니다.
// - API가 없는 배포(예: Netlify Drop 정적 업로드)에서는 조회가 실패하므로 빌드 시점 값이 그대로 사용됩니다.
// 등록금 Provider(PublicTuitionProvider)와는 별개로 동작합니다.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isValidSiteContactRaw, resolveSiteContact, type SiteContact } from "@/lib/siteContact";

const SiteContactContext = createContext<SiteContact | null>(null);

/** 공개 연락처 재조회 간격: 5분 */
const REFRESH_INTERVAL_MS = 300_000;

/** 공개 API 조회 — 실패·비정상 응답이면 null (예외를 던지지 않음) */
async function fetchSiteContact(): Promise<SiteContact | null> {
  try {
    const response = await fetch("/api/public/site-contact", { cache: "no-store" });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return null;
    const body = payload as { success?: unknown; contact?: unknown };
    if (body.success !== true || !isValidSiteContactRaw(body.contact)) return null;
    return resolveSiteContact(body.contact);
  } catch {
    return null;
  }
}

/** Footer · 상담 카드 · 학원소개에서 연락처를 읽는 훅 (항상 모든 항목이 채워진 값) */
export function useSiteContact(): SiteContact {
  const ctx = useContext(SiteContactContext);
  if (!ctx) {
    throw new Error("useSiteContact()는 SiteContactProvider 내부의 클라이언트 컴포넌트에서만 사용할 수 있습니다.");
  }
  return ctx;
}

export default function SiteContactProvider({
  contact,
  children,
}: {
  /** 빌드 시점 연락처 (빈 항목은 이미 기본값으로 채워진 값) */
  contact: SiteContact;
  children: ReactNode;
}) {
  // API에서 받은 최신 값 (검증 통과한 값만). 아직 없으면 빌드 시점 값을 사용합니다.
  const [latestContact, setLatestContact] = useState<SiteContact | null>(null);

  useEffect(() => {
    let active = true; // 해제된 뒤 도착한 응답은 반영하지 않음
    let requestSeq = 0; // 늦게 도착한 이전 요청의 응답이 최신 응답을 덮어쓰지 않도록

    async function refresh() {
      const seq = ++requestSeq;
      const data = await fetchSiteContact();
      if (!active || seq !== requestSeq) return;
      if (data) setLatestContact(data);
      // 실패하거나 검증을 통과하지 못하면 아무것도 바꾸지 않음 → 마지막 정상 값 유지
    }

    void refresh(); // 최초 진입 시 조회
    const timer = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return <SiteContactContext.Provider value={latestContact ?? contact}>{children}</SiteContactContext.Provider>;
}
