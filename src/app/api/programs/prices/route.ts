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
import { previousDay, validatePriceInput, type PriceInput } from "@/lib/programPriceValidation";

export const runtime = "nodejs";

function errorBody(errors: Record<string, string>) {
  return { success: false, message: Object.values(errors)[0], errors };
}

// POST /api/programs/prices 기간 옵션에 가격 추가 (SUPER_ADMIN, ADMIN)
// 본문: program_option_id, price(원 단위 정수), currency(KRW), valid_from, valid_until?, is_active?
//
// 가격 변경 = 새 가격 추가. 기존 가격 행은 지우지 않습니다.
// - 새 가격이 "종료일 없음"이고, 겹치는 기존 활성 가격이 모두 새 시작일보다 먼저 시작했다면
//   기존 가격을 새 시작일 전날로 종료 처리 (가격 이력 유지)
// - 그 밖에 활성 가격과 기간이 겹치면 409 (어느 가격을 적용할지 모호해지므로 저장하지 않음)
export async function POST(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  let body: PriceInput & { program_option_id?: unknown };
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

    const optionId = parseId(body.program_option_id);
    const { data, errors } = validatePriceInput(body);
    if (optionId === null) errors.program_option_id = "기간 옵션을 선택해 주세요.";
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(errorBody(errors), { status: 400 });
    }

    const ip = clientIp(request);
    const result = await prisma.$transaction(async (tx) => {
      if (!(await lockProgramOption(tx, optionId!))) {
        throw new PriceRequestError(404, "기간 옵션을 찾을 수 없습니다.", "program_option_id");
      }

      const closed: { id: string; valid_until: string }[] = [];
      if (data.is_active) {
        const overlaps = await findOverlappingPrices(tx, optionId!, data.valid_from, data.valid_until);
        const canClose =
          data.valid_until === null &&
          overlaps.every((row: { valid_from: Date }) => (dateText(row.valid_from) as string) < data.valid_from);

        if (overlaps.length > 0 && !canClose) {
          const first = overlaps[0];
          throw new PriceRequestError(
            409,
            `적용 기간이 겹치는 활성 가격이 있습니다. (${dateText(first.valid_from)} ~ ${dateText(first.valid_until) ?? "종료일 없음"}) ` +
              "기존 가격의 종료일을 조정하거나 비활성화한 뒤 다시 등록해 주세요.",
            "valid_from"
          );
        }

        // 가격 변경: 기존 가격을 새 시작일 전날로 종료
        const closeUntil = previousDay(data.valid_from);
        for (const row of overlaps) {
          const updated = await tx.program_prices.update({
            where: { id: row.id },
            data: { valid_until: dateOnly(closeUntil) },
            select: PRICE_SELECT,
          });
          await logPriceChange(tx, { adminId: admin.id, action: "UPDATE", recordId: row.id, oldData: row, newData: updated, ip });
          closed.push({ id: row.id.toString(), valid_until: closeUntil });
        }
      }

      const created = await tx.program_prices.create({
        data: {
          program_option_id: optionId!,
          price: data.price,
          currency: data.currency,
          valid_from: dateOnly(data.valid_from),
          valid_until: data.valid_until ? dateOnly(data.valid_until) : null,
          is_active: data.is_active,
        },
        select: PRICE_SELECT,
      });
      await logPriceChange(tx, { adminId: admin.id, action: "CREATE", recordId: created.id, oldData: null, newData: created, ip });

      return { created, closed };
    });

    return NextResponse.json(
      {
        success: true,
        message:
          result.closed.length > 0
            ? `가격이 등록되었습니다. 기존 가격은 ${result.closed[0].valid_until}까지 적용되도록 종료 처리했습니다.`
            : "가격이 등록되었습니다.",
        price: serializeBigInt(result.created),
        closed: result.closed,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof PriceRequestError) {
      return NextResponse.json(
        error.field ? errorBody({ [error.field]: error.message }) : { success: false, message: error.message },
        { status: error.status }
      );
    }

    console.error("가격 등록 오류:", error);

    return NextResponse.json({ success: false, message: "가격 등록에 실패했습니다." }, { status: 500 });
  }
}
