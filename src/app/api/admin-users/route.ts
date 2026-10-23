import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAdminSessionFromRequest, adminUnauthorizedResponse } from "@/lib/adminApiAuth";
import { getCurrentAdmin } from "@/lib/adminPermissions";

async function requireSuperAdmin(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) return null;
  const admin = await getCurrentAdmin(session.id);
  if (!admin || !admin.is_active || admin.roles.code !== "SUPER_ADMIN") return null;
  return { session, admin };
}

function serializeAdmin(admin: any) {
  return {
    id: admin.id.toString(),
    username: admin.username,
    name: admin.name,
    email: admin.email ?? "",
    is_active: admin.is_active,
    last_login_at: admin.last_login_at?.toISOString() ?? null,
    created_at: admin.created_at.toISOString(),
    updated_at: admin.updated_at.toISOString(),
    role: {
      id: admin.roles.id.toString(),
      code: admin.roles.code,
      name: admin.roles.name,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    if (!(await requireSuperAdmin(request))) return adminUnauthorizedResponse();

    const [admins, roles] = await Promise.all([
      prisma.admin_users.findMany({ include: { roles: true }, orderBy: [{ is_active: "desc" }, { id: "asc" }] }),
      prisma.roles.findMany({ orderBy: { id: "asc" } }),
    ]);

    return NextResponse.json({
      success: true,
      admins: admins.map(serializeAdmin),
      roles: roles.map((role) => ({ id: role.id.toString(), code: role.code, name: role.name, description: role.description ?? "" })),
    });
  } catch (error) {
    console.error("관리자 계정 조회 오류:", error);
    return NextResponse.json({ success: false, message: "관리자 계정을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth) return adminUnauthorizedResponse();

    const body = await request.json();
    const username = String(body.username ?? "").trim();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const password = typeof body.password === "string" ? body.password : "";
    const roleCode = String(body.role_code ?? "").trim();

    if (!username || !name || !password || !roleCode) {
      return NextResponse.json({ success: false, message: "아이디, 이름, 비밀번호, 권한을 모두 입력해 주세요." }, { status: 400 });
    }
    if (!/^[A-Za-z0-9._-]{4,100}$/.test(username)) {
      return NextResponse.json({ success: false, message: "아이디는 영문, 숫자, 점, 밑줄, 하이픈으로 4자 이상 입력해 주세요." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, message: "비밀번호는 8자 이상 입력해 주세요." }, { status: 400 });
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ success: false, message: "이메일 형식을 확인해 주세요." }, { status: 400 });
    }

    const role = await prisma.roles.findUnique({ where: { code: roleCode } });
    if (!role) return NextResponse.json({ success: false, message: "존재하지 않는 관리자 권한입니다." }, { status: 400 });

    const existing = await prisma.admin_users.findUnique({ where: { username } });
    if (existing) return NextResponse.json({ success: false, message: "이미 사용 중인 관리자 아이디입니다." }, { status: 409 });

    const password_hash = await bcrypt.hash(password, 12);
    const created = await prisma.admin_users.create({
      data: { username, name, email: email || null, password_hash, role_id: role.id, is_active: true },
      include: { roles: true },
    });

    await prisma.admin_logs.create({
      data: {
        admin_user_id: BigInt(auth.session.id),
        action: "CREATE",
        table_name: "admin_users",
        record_id: created.id,
        new_data: serializeAdmin(created),
      },
    });

    return NextResponse.json({ success: true, admin: serializeAdmin(created) }, { status: 201 });
  } catch (error) {
    console.error("관리자 계정 생성 오류:", error);
    return NextResponse.json({ success: false, message: "관리자 계정을 생성하지 못했습니다." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (!auth) return adminUnauthorizedResponse();

    const body = await request.json();
    const idText = String(body.id ?? "");
    if (!/^\d{1,18}$/.test(idText)) return NextResponse.json({ success: false, message: "관리자 ID가 올바르지 않습니다." }, { status: 400 });

    const id = BigInt(idText);
    const target = await prisma.admin_users.findUnique({ where: { id }, include: { roles: true } });
    if (!target) return NextResponse.json({ success: false, message: "관리자 계정을 찾을 수 없습니다." }, { status: 404 });

    const name = body.name === undefined ? target.name : String(body.name).trim();
    const email = body.email === undefined ? target.email ?? "" : String(body.email).trim();
    const roleCode = body.role_code === undefined ? target.roles.code : String(body.role_code).trim();
    const isActive = body.is_active === undefined ? target.is_active : Boolean(body.is_active);
    const password = typeof body.password === "string" ? body.password : "";

    if (!name) return NextResponse.json({ success: false, message: "이름을 입력해 주세요." }, { status: 400 });
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ success: false, message: "이메일 형식을 확인해 주세요." }, { status: 400 });
    if (password && password.length < 8) return NextResponse.json({ success: false, message: "새 비밀번호는 8자 이상 입력해 주세요." }, { status: 400 });

    // 현재 로그인한 SUPER_ADMIN 자신은 실수로 비활성화할 수 없게 합니다.
    if (id === BigInt(auth.session.id) && !isActive) {
      return NextResponse.json({ success: false, message: "현재 로그인한 관리자 계정은 비활성화할 수 없습니다." }, { status: 400 });
    }

    const role = await prisma.roles.findUnique({ where: { code: roleCode } });
    if (!role) return NextResponse.json({ success: false, message: "존재하지 않는 관리자 권한입니다." }, { status: 400 });

    const data: any = {
      name,
      email: email || null,
      role_id: role.id,
      is_active: isActive,
      updated_at: new Date(),
    };
    if (password) data.password_hash = await bcrypt.hash(password, 12);

    const updated = await prisma.admin_users.update({ where: { id }, data, include: { roles: true } });

    await prisma.admin_logs.create({
      data: {
        admin_user_id: BigInt(auth.session.id),
        action: "UPDATE",
        table_name: "admin_users",
        record_id: id,
        old_data: serializeAdmin(target),
        new_data: serializeAdmin(updated),
      },
    });

    return NextResponse.json({ success: true, admin: serializeAdmin(updated) });
  } catch (error) {
    console.error("관리자 계정 수정 오류:", error);
    return NextResponse.json({ success: false, message: "관리자 계정을 수정하지 못했습니다." }, { status: 500 });
  }
}
