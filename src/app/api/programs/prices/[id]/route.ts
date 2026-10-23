import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { getAdminSessionFromRequest, adminUnauthorizedResponse } from "@/lib/adminApiAuth";
import { canManagePrices, getActiveAdmin } from "@/lib/adminRoles";
import {
  PRICE_SELECT,
  PriceRequestError,
  clientIp,
  dateOnly,
  dateText,
  findOverlappingPrices,
  lockProgramOption,
  logPriceChange,
  parseId,
} from "@/lib/programPrices";
import { validatePriceInput, type PriceInput } from "@/lib/programPriceValidation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorBody(errors: Record<string, string>) {
  return { success: false, message: Object.values(errors)[0], errors };
}

// PUT /api/programs/prices/[id] 가격 행 수정 (SUPER_ADMIN, ADMIN)
// 잘못 입력한 금액·기간 정정, 종료일 지정, 활성/비활성 전환에 사용합니다. 기간 옵션은 바꿀 수 없습니다.
// 가격 자체를 바꾸는 경우(예: 내년부터 인상)는 수정 대신 새 가격을 추가해 이력을 남기는 것을 권장합니다.
// 삭제 API는 두지 않습니다. (필요 없는 가격은 비활성화)
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  const { id } = await params;
  const priceId = parseId(id);
  if (priceId === null) {
    return NextResponse.json({ success: false, message: "올바르지 않은 가격 ID입니다." }, { status: 400 });
  }

  let body: PriceInput;
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
        { success: false, message: "가격 등록·수정은 관리자(SUPER_ADMIN, ADMIN)만 할 수 있습니다." },
        { status: 403 }
      );
    }

    const { data, errors } = validatePriceInput(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(errorBody(errors), { status: 400 });
    }

    const ip = clientIp(request);
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.program_prices.findUnique({ where: { id: priceId }, select: PRICE_SELECT });
      if (!current) throw new PriceRequestError(404, "가격 정보를 찾을 수 없습니다.");

      await lockProgramOption(tx, current.program_option_id);

      if (data.is_active) {
        const overlaps = await findOverlappingPrices(tx, current.program_option_id, data.valid_from, data.valid_until, priceId);
        if (overlaps.length > 0) {
          const first = overlaps[0];
          throw new PriceRequestError(
            409,
            `적용 기간이 겹치는 다른 활성 가격이 있습니다. (${dateText(first.valid_from)} ~ ${dateText(first.valid_until) ?? "종료일 없음"})`,
            "valid_from"
          );
        }
      }

      const saved = await tx.program_prices.update({
        where: { id: priceId },
        data: {
          price: data.price,
          currency: data.currency,
          valid_from: dateOnly(data.valid_from),
          valid_until: data.valid_until ? dateOnly(data.valid_until) : null,
          is_active: data.is_active,
        },
        select: PRICE_SELECT,
      });
      await logPriceChange(tx, { adminId: admin.id, action: "UPDATE", recordId: priceId, oldData: current, newData: saved, ip });
      return saved;
    });

    return NextResponse.json({
      success: true,
      message: "가격 정보가 수정되었습니다.",
      price: serializeBigInt(updated),
    });
  } catch (error) {
    if (error instanceof PriceRequestError) {
      return NextResponse.json(
        error.field ? errorBody({ [error.field]: error.message }) : { success: false, message: error.message },
        { status: error.status }
      );
    }
    if (error && typeof error === "object" && (error as { code?: unknown }).code === "P2025") {
      return NextResponse.json({ success: false, message: "가격 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    console.error("가격 수정 오류:", error);

    return NextResponse.json({ success: false, message: "가격 수정에 실패했습니다." }, { status: 500 });
  }
}
