import { NextResponse } from "next/server";
import { loadPublicTuition } from "@/lib/publicTuition.server";

export const runtime = "nodejs";

/**
 * GET /api/programs/public-prices 홈페이지 공개 교육비 (로그인 불필요)
 *
 * 학비표·맞춤견적서가 쓰는 것과 같은 데이터(loadPublicTuition)를 그대로 돌려줍니다.
 *   { success, date, courses: { intensiveEsl: [{ weeks, price }], ... } }
 * - 과정별 "홈페이지 표시" 기간 최대 4개, 오늘 적용되는 활성 KRW 가격만
 * - 가격 이력·관리자 정보는 포함하지 않습니다.
 *
 * 현재 Netlify Drop 정적 배포에서는 API가 업로드되지 않으므로 사용되지 않습니다.
 * (정적 배포는 빌드 시 [lang]/layout.tsx 에서 같은 함수를 직접 호출)
 * 홈페이지를 서버 방식으로 바꿔 실시간 조회가 필요할 때 이 API를 사용하면 됩니다.
 */
export async function GET() {
  try {
    const data = await loadPublicTuition();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error("공개 프로그램 가격 조회 오류:", error);
    return NextResponse.json({ success: false, message: "가격 정보를 불러오지 못했습니다." }, { status: 500 });
  }
}
