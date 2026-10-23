import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("sya_admin_session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "로그인이 필요합니다.",
        },
        { status: 401 }
      );
    }

    const session = await verifySession(token);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "로그인 세션이 만료되었거나 유효하지 않습니다.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      admin: session,
    });
  } catch (error) {
    console.error("관리자 세션 확인 오류:", error);

    return NextResponse.json(
      {
        success: false,
        message: "세션 확인 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}