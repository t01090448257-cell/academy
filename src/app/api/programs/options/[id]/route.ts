import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { getAdminSessionFromRequest, adminUnauthorizedResponse } from "@/lib/adminApiAuth";
import { canManagePrices, getActiveAdmin } from "@/lib/adminRoles";
import { PriceRequestError, clientIp, parseId } from "@/lib/programPrices";
import { todayKst } from "@/lib/programPriceValidation";
import {
  NO_PRICE_PUBLIC_MESSAGE,
  publicLimitMessage,
  validateOptionSettings,
  type OptionSettingsInput,
} from "@/lib/programOptionValidation";
import { OPTION_SELECT, countPublicOptions, hasUsablePrice, lockProgram, logOptionChange, nextDisplayOrder } from "@/lib/programOptions";
import { MAX_PUBLIC_OPTIONS, isProgramCode } from "@/config/programPricing";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorBody(errors: Record<string, string>) {
  return { success: false, message: Object.values(errors)[0], errors };
}

// PUT /api/programs/options/[id] 기간의 홈페이지 표시·표시 순서·사용 여부 변경 (SUPER_ADMIN, ADMIN)
// 본문: is_public, display_order?(비우면 홈페이지 표시일 때 마지막 순서), is_active
// - 주수·가격은 여기서 바꾸지 않습니다. (주수는 수납 기록이 참조, 가격은 가격 이력으로 관리)
// - 홈페이지 표시: 프로그램별 최대 4개(활성 기간 기준), 적용 중이거나 적용 예정인 활성 가격 필요
// - 이전 REGULAR/CAMP 프로그램은 홈페이지 표시를 켤 수 없습니다. (사용 여부만 변경 가능)
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  const { id } = await params;
  const optionId = parseId(id);
  if (optionId === null) {
    return NextResponse.json({ success: false, message: "올바르지 않은 기간 ID입니다." }, { status: 400 });
  }

  let body: OptionSettingsInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  body = body && typeof body === "object" ? body : {};

  try {
    const admin = await getActiveAdmin(session);
    if (!admin || !canManagePrices(admin.role)) {
      return NextResponse.json(
        { success: false, message: "기간 설정 변경은 관리자(SUPER_ADMIN, ADMIN)만 할 수 있습니다." },
        { status: 403 }
      );
    }

    const { data, errors } = validateOptionSettings(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(errorBody(errors), { status: 400 });
    }

    const ip = clientIp(request);
    const today = todayKst();
    const saved = await prisma.$transaction(async (tx) => {
      const current = await tx.program_options.findUnique({ where: { id: optionId }, select: OPTION_SELECT });
      if (!current) throw new PriceRequestError(404, "기간 정보를 찾을 수 없습니다.");

      const program = await lockProgram(tx, current.program_id);
      if (!program) throw new PriceRequestError(404, "프로그램을 찾을 수 없습니다.");

      if (data.is_public && !isProgramCode(program.code)) {
        throw new PriceRequestError(400, "이전 구조의 프로그램(REGULAR, CAMP)은 홈페이지에 표시하지 않습니다.", "is_public");
      }

      if (data.is_public && data.is_active) {
        const count = await countPublicOptions(tx, current.program_id, optionId);
        if (count >= MAX_PUBLIC_OPTIONS) throw new PriceRequestError(409, publicLimitMessage(), "is_public");
      }

      // 새로 켤 때만 가격 확인 (이미 표시 중인 기간의 순서·사용 여부 변경은 막지 않음 — 가격이 없으면 홈페이지에서 자동 제외)
      if (data.is_public && !current.is_public && !(await hasUsablePrice(tx, optionId, today))) {
        throw new PriceRequestError(409, NO_PRICE_PUBLIC_MESSAGE, "is_public");
      }

      let displayOrder = data.display_order;
      if (data.is_public && displayOrder === null) {
        displayOrder = current.display_order ?? (await nextDisplayOrder(tx, current.program_id));
      }

      const updated = await tx.program_options.update({
        where: { id: optionId },
        data: {
          is_public: data.is_public,
          display_order: displayOrder,
          is_active: data.is_active,
          updated_at: new Date(),
        },
        select: OPTION_SELECT,
      });
      await logOptionChange(tx, { adminId: admin.id, action: "UPDATE", recordId: optionId, oldData: current, newData: updated, ip });
      return updated;
    });

    return NextResponse.json({
      success: true,
      message: `${saved.duration_weeks}주 기간 설정이 저장되었습니다.`,
      option: serializeBigInt(saved),
    });
  } catch (error) {
    if (error instanceof PriceRequestError) {
      return NextResponse.json(
        error.field ? errorBody({ [error.field]: error.message }) : { success: false, message: error.message },
        { status: error.status }
      );
    }

    console.error("기간 설정 저장 오류:", error);

    return NextResponse.json({ success: false, message: "기간 설정을 저장하지 못했습니다." }, { status: 500 });
  }
}
