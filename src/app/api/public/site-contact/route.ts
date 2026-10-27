// src/app/api/public/site-contact/route.ts
// ─────────────────────────────────────────────────────────────────────
// GET /api/public/site-contact — 홈페이지 공개 연락처 (로그인 불필요, 읽기 전용)
//
// - 관리자 전용 /api/settings 와 분리된 파일입니다.
// - app_settings 의 공개용 6개 항목만 돌려줍니다. 비어 있는 값은 null (기본값 대체는 화면에서 처리)
//     { success: true, contact: { koreaPhone, localPhone, email, campusAddress, koreaOfficeAddress, philippinesOfficeAddress } }
// - DB 행을 만들거나 수정하지 않습니다.
// - DB 조회 실패 시 500 { success: false, message } (오류를 성공 응답이나 임의 데이터로 감추지 않음)
// - 관리자 변경이 바로 보이도록 캐시하지 않습니다.
// ─────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { readPublicSiteContactRaw } from "@/lib/siteContact.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
} as const;

export async function GET() {
  try {
    const contact = await readPublicSiteContactRaw();
    return NextResponse.json({ success: true, contact }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[public site-contact] 연락처 조회 오류:", error);
    return NextResponse.json(
      { success: false, message: "연락처 정보를 불러오지 못했습니다." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
