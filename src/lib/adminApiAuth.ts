// src/lib/adminApiAuth.ts
// 관리자 전용 API에서 로그인 여부를 확인하는 도우미.
// 새 인증 방식이 아니라, 기존 /api/auth/me와 같은 방식(sya_admin_session 쿠키 + verifySession)을 그대로 사용합니다.
// (proxy.ts는 /api 경로를 검사하지 않으므로, 개인정보를 다루는 API는 각 라우트에서 직접 확인해야 합니다.)

import { NextResponse, type NextRequest } from "next/server";
import { verifySession, type AdminSession } from "@/lib/auth";

export const ADMIN_SESSION_COOKIE = "sya_admin_session";

/** 로그인한 관리자 세션을 돌려주고, 로그인하지 않았거나 세션이 유효하지 않으면 null */
export async function getAdminSessionFromRequest(
  request: NextRequest
): Promise<AdminSession | null> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** 401 응답 (학생 정보 등 어떤 데이터도 포함하지 않음) */
export function adminUnauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      message: "로그인이 필요합니다.",
    },
    { status: 401 }
  );
}
