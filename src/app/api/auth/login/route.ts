import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { createSession } from "@/lib/auth";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL이 설정되지 않았습니다.");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

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
  } finally {
    await prisma.$disconnect();
  }
}