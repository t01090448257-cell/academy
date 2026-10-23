// src/lib/publicProgramPrices.ts
// 홈페이지 공개 교육비를 브라우저에서 API로 다시 받아오는 도우미 (향후 서버 방식 전환용)
//
// 지금은 사용하지 않습니다. 정적 배포(Netlify Drop)에서는 빌드 시 [lang]/layout.tsx 가
// loadPublicTuition()(src/lib/publicTuition.server.ts) 결과를 PublicTuitionProvider 로 넣어 줍니다.
// 홈페이지를 서버 방식으로 바꾸면 이 함수로 GET /api/programs/public-prices 를 읽어
// PublicTuitionProvider 의 tuition 값만 바꾸면 됩니다. (학비표·맞춤견적서 코드는 그대로)
//
// 이전 구조(REGULAR/CAMP 그룹 가격을 5개 과정에 공통 적용)는 더 이상 사용하지 않습니다.

import type { PublicTuitionData } from "@/lib/publicTuition";

export async function fetchPublicTuition(): Promise<PublicTuitionData | null> {
  try {
    const response = await fetch("/api/programs/public-prices", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as { success?: boolean } & Partial<PublicTuitionData>;
    if (!payload.success || !payload.courses || !payload.date) return null;
    return { date: payload.date, courses: payload.courses };
  } catch {
    return null;
  }
}
