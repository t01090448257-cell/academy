import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSessionFromRequest, adminUnauthorizedResponse } from "@/lib/adminApiAuth";
import { getCurrentAdmin } from "@/lib/adminPermissions";

const DEFAULTS = {
  academy_name: "SYA Academy",
  contact_phone: "",
  contact_email: "",
  address: "",
  default_currency: "KRW",
  default_payment_method: "bank_transfer",
  default_enrollment_status: "inquiry",
};

function serialize(settings: any) {
  return {
    academy_name: settings.academy_name,
    contact_phone: settings.contact_phone ?? "",
    contact_email: settings.contact_email ?? "",
    address: settings.address ?? "",
    default_currency: settings.default_currency,
    default_payment_method: settings.default_payment_method,
    default_enrollment_status: settings.default_enrollment_status,
    updated_at: settings.updated_at,
  };
}

async function requireAdmin(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) return { session: null, admin: null };
  const admin = await getCurrentAdmin(session.id);
  if (!admin || !admin.is_active) return { session: null, admin: null };
  return { session, admin };
}

export async function GET(request: NextRequest) {
  try {
    const { session } = await requireAdmin(request);
    if (!session) return adminUnauthorizedResponse();

    const settings = await prisma.app_settings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, ...DEFAULTS },
    });

    return NextResponse.json({ success: true, settings: serialize(settings) });
  } catch (error) {
    console.error("관리자 설정 조회 오류:", error);
    return NextResponse.json({ success: false, message: "설정을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, admin } = await requireAdmin(request);
    if (!session || !admin) return adminUnauthorizedResponse();

    if (!["SUPER_ADMIN", "ADMIN"].includes(admin.roles.code)) {
      return NextResponse.json({ success: false, message: "설정 변경 권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const academy_name = String(body.academy_name ?? "").trim();
    const contact_phone = String(body.contact_phone ?? "").trim();
    const contact_email = String(body.contact_email ?? "").trim();
    const address = String(body.address ?? "").trim();
    const default_currency = String(body.default_currency ?? "KRW").trim().toUpperCase();
    const default_payment_method = String(body.default_payment_method ?? "bank_transfer").trim();
    const default_enrollment_status = String(body.default_enrollment_status ?? "inquiry").trim();

    if (!academy_name) {
      return NextResponse.json({ success: false, message: "학원명을 입력해 주세요." }, { status: 400 });
    }
    if (!/^[A-Z]{3}$/.test(default_currency)) {
      return NextResponse.json({ success: false, message: "통화 코드는 3자리 영문으로 입력해 주세요." }, { status: 400 });
    }
    if (contact_email && !/^\S+@\S+\.\S+$/.test(contact_email)) {
      return NextResponse.json({ success: false, message: "이메일 형식을 확인해 주세요." }, { status: 400 });
    }

    const before = await prisma.app_settings.findUnique({ where: { id: 1 } });
    const settings = await prisma.app_settings.upsert({
      where: { id: 1 },
      update: {
        academy_name,
        contact_phone: contact_phone || null,
        contact_email: contact_email || null,
        address: address || null,
        default_currency,
        default_payment_method,
        default_enrollment_status,
        updated_by_admin_id: BigInt(session.id),
        updated_at: new Date(),
      },
      create: {
        id: 1,
        academy_name,
        contact_phone: contact_phone || null,
        contact_email: contact_email || null,
        address: address || null,
        default_currency,
        default_payment_method,
        default_enrollment_status,
        updated_by_admin_id: BigInt(session.id),
      },
    });

    await prisma.admin_logs.create({
      data: {
        admin_user_id: BigInt(session.id),
        action: before ? "UPDATE" : "CREATE",
        table_name: "app_settings",
        record_id: BigInt(1),
        old_data: before ? serialize(before) : undefined,
        new_data: serialize(settings),
      },
    });

    return NextResponse.json({ success: true, settings: serialize(settings) });
  } catch (error) {
    console.error("관리자 설정 저장 오류:", error);
    return NextResponse.json({ success: false, message: "설정을 저장하지 못했습니다." }, { status: 500 });
  }
}
