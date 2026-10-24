import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
// 공용 Prisma 연결 사용 (DB 주소 선택: Netlify = NETLIFY_DB_URL, 로컬 = DATABASE_URL — src/lib/prisma.ts)
// 이전에는 이 파일에서 PrismaClient를 따로 만들어 함수 인스턴스마다 DB 연결 풀이 하나 더 생겼습니다.
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const username =
      typeof body.username === "string" ? body.username.trim() : "";

    const password =
      typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "아이디와 비밀번호를 입력해주세요.",
        },
        { status: 400 }
      );
    }

    const admin = await prisma.admin_users.findUnique({
      where: {
        username,
      },
      include: {
        roles: true,
      },
    });

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "아이디 또는 비밀번호가 올바르지 않습니다.",
        },
        { status: 401 }
      );
    }

    if (!admin.is_active) {
      return NextResponse.json(
        {
          success: false,
          message: "비활성화된 관리자 계정입니다.",
        },
        { status: 403 }
      );
    }

    const passwordValid = await bcrypt.compare(
      password,
      admin.password_hash
    );

    if (!passwordValid) {
      return NextResponse.json(
        {
          success: false,
          message: "아이디 또는 비밀번호가 올바르지 않습니다.",
        },
        { status: 401 }
      );
    }

    await prisma.admin_users.update({
      where: {
        id: admin.id,
      },
      data: {
        last_login_at: new Date(),
        updated_at: new Date(),
      },
    });

    const sessionToken = await createSession({
      id: admin.id.toString(),
      username: admin.username,
      name: admin.name,
      role: admin.roles.code,
    });

    const response = NextResponse.json({
      success: true,
      message: "로그인되었습니다.",
      admin: {
        id: admin.id.toString(),
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: {
          id: admin.roles.id.toString(),
          code: admin.roles.code,
          name: admin.roles.name,
        },
      },
    });

    response.cookies.set({
      name: "sya_admin_session",
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    console.error("관리자 로그인 오류:", error);

    return NextResponse.json(
      {
        success: false,
        message: "로그인 처리 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
  // 공용 연결이므로 요청마다 $disconnect()하지 않습니다.
  // (같은 서버 인스턴스에서 동시에 처리 중인 다른 요청의 DB 연결까지 끊길 수 있음)
}