import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSessionFromRequest, adminUnauthorizedResponse } from "@/lib/adminApiAuth";
import { getCurrentAdmin } from "@/lib/adminPermissions";
import { isValidPhone, SITE_CONTACT_LIMITS } from "@/lib/siteContact";

const DEFAULTS = {
  academy_name: "SYA Academy",
  contact_phone: "",
  contact_email: "",
  address: "",
  local_phone: "",
  korea_office_address: "",
  philippines_office_address: "",
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
    local_phone: settings.local_phone ?? "",
    korea_office_address: settings.korea_office_address ?? "",
    philippines_office_address: settings.philippines_office_address ?? "",
    default_currency: settings.default_currency,
    default_payment_method: settings.default_payment_method,
    default_enrollment_status: settings.default_enrollment_status,
    updated_at: settings.updated_at,
  };
}

/** 주소: 줄바꿈·연속 공백을 한 칸으로 (홈페이지에 한 줄로 표시) */
function singleLine(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

/** 홈페이지 연락처 항목 검증. 문제가 있으면 사용자에게 보여 줄 오류 문구, 없으면 null */
function validateContactFields(fields: {
  contact_phone: string;
  local_phone: string;
  contact_email: string;
  address: string;
  korea_office_address: string;
  philippines_office_address: string;
}): string | null {
  const phoneRule = "숫자, +, -, 공백, 괄호, 마침표만 사용하고 숫자는 7~15자리로 입력해 주세요.";
  if (fields.contact_phone.length > SITE_CONTACT_LIMITS.phone) {
    return `한국 상담전화는 ${SITE_CONTACT_LIMITS.phone}자 이내로 입력해 주세요.`;
  }
  if (fields.contact_phone && !isValidPhone(fields.contact_phone)) {
    return `한국 상담전화 형식을 확인해 주세요. ${phoneRule}`;
  }
  if (fields.local_phone.length > SITE_CONTACT_LIMITS.phone) {
    return `필리핀 현지 전화번호는 ${SITE_CONTACT_LIMITS.phone}자 이내로 입력해 주세요.`;
  }
  if (fields.local_phone && !isValidPhone(fields.local_phone)) {
    return `필리핀 현지 전화번호 형식을 확인해 주세요. ${phoneRule}`;
  }
  if (fields.contact_email.length > SITE_CONTACT_LIMITS.email) {
    return `상담 이메일은 ${SITE_CONTACT_LIMITS.email}자 이내로 입력해 주세요.`;
  }
  const addresses: [string, string][] = [
    ["필리핀 캠퍼스 주소", fields.address],
    ["한국 사무소 주소", fields.korea_office_address],
    ["필리핀 사무소 주소", fields.philippines_office_address],
  ];
  for (const [label, value] of addresses) {
    if (value.length > SITE_CONTACT_LIMITS.address) {
      return `${label}는 ${SITE_CONTACT_LIMITS.address}자 이내로 입력해 주세요.`;
    }
  }
  return null;
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
    const address = singleLine(body.address);
    const local_phone = String(body.local_phone ?? "").trim();
    const korea_office_address = singleLine(body.korea_office_address);
    const philippines_office_address = singleLine(body.philippines_office_address);
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
    // 홈페이지 연락처 항목 검증 (Footer·상담 카드·학원소개에 그대로 표시되므로 비정상 값은 저장하지 않음)
    const contactError = validateContactFields({
      contact_phone,
      local_phone,
      contact_email,
      address,
      korea_office_address,
      philippines_office_address,
    });
    if (contactError) {
      return NextResponse.json({ success: false, message: contactError }, { status: 400 });
    }

    const before = await prisma.app_settings.findUnique({ where: { id: 1 } });
    const settings = await prisma.app_settings.upsert({
      where: { id: 1 },
      update: {
        academy_name,
        contact_phone: contact_phone || null,
        contact_email: contact_email || null,
        address: address || null,
        local_phone: local_phone || null,
        korea_office_address: korea_office_address || null,
        philippines_office_address: philippines_office_address || null,
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
        local_phone: local_phone || null,
        korea_office_address: korea_office_address || null,
        philippines_office_address: philippines_office_address || null,
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
