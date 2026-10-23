import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { getAdminSessionFromRequest, adminUnauthorizedResponse } from "@/lib/adminApiAuth";
import { canManagePrices, getActiveAdmin } from "@/lib/adminRoles";
import { PRICE_SELECT, PriceRequestError, clientIp, dateOnly, logPriceChange, parseId } from "@/lib/programPrices";
import { priceState, todayKst, validatePriceInput, type PriceInput } from "@/lib/programPriceValidation";
import {
  NO_PRICE_PUBLIC_MESSAGE,
  publicLimitMessage,
  validateDurationWeeks,
  validateOptionSettings,
  type OptionSettingsInput,
} from "@/lib/programOptionValidation";
import { OPTION_SELECT, countPublicOptions, lockProgram, logOptionChange, nextDisplayOrder } from "@/lib/programOptions";
import { MAX_PUBLIC_OPTIONS, isProgramCode } from "@/config/programPricing";

export const runtime = "nodejs";

function errorBody(errors: Record<string, string>) {
  return { success: false, message: Object.values(errors)[0], errors };
}

type Body = PriceInput &
  OptionSettingsInput & {
    program_id?: unknown;
    duration_weeks?: unknown;
  };

// POST /api/programs/options 프로그램에 기간(주수) 추가 (SUPER_ADMIN, ADMIN — 가격 등록과 같은 권한)
// 본문: program_id, duration_weeks, price?(비우면 가격 없이 기간만 추가), currency, valid_from, valid_until?,
//       is_active(기간·첫 가격 활성), is_public(홈페이지 표시), display_order?
//
// - 신규 5개 프로그램(REGULAR_ESL 등)에만 추가할 수 있습니다. 이전 REGULAR/CAMP 는 기존 기간 그대로 보존
// - 같은 프로그램에 같은 주수가 있으면 409
// - 홈페이지 표시는 프로그램별 최대 4개, 가격이 없는 기간은 표시할 수 없음
// - 기간 + 첫 가격 + 변경 기록을 하나의 트랜잭션으로 저장
export async function POST(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  let body: Body;
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
        { success: false, message: "기간·가격 등록은 관리자(SUPER_ADMIN, ADMIN)만 할 수 있습니다." },
        { status: 403 }
      );
    }

    const errors: Record<string, string> = {};
    const programId = parseId(body.program_id);
    if (programId === null) errors.program_id = "프로그램을 선택해 주세요.";

    const { weeks, error: weeksError } = validateDurationWeeks(body.duration_weeks);
    if (weeksError) errors.duration_weeks = weeksError;

    const settings = validateOptionSettings(body);
    Object.assign(errors, settings.errors);

    const hasPrice = !(body.price === undefined || body.price === null || (typeof body.price === "string" && body.price.trim() === ""));
    const price = hasPrice ? validatePriceInput({ ...body, is_active: settings.data.is_active }) : null;
    if (price) Object.assign(errors, price.errors);

    if (settings.data.is_public && !errors.is_public) {
      if (!hasPrice) errors.is_public = NO_PRICE_PUBLIC_MESSAGE;
      else if (price && Object.keys(price.errors).length === 0) {
        const state = priceState(price.data, todayKst());
        if (state !== "current" && state !== "scheduled") errors.is_public = NO_PRICE_PUBLIC_MESSAGE;
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(errorBody(errors), { status: 400 });
    }

    const ip = clientIp(request);
    const result = await prisma.$transaction(async (tx) => {
      const program = await lockProgram(tx, programId!);
      if (!program) throw new PriceRequestError(404, "프로그램을 찾을 수 없습니다.", "program_id");
      if (!isProgramCode(program.code)) {
        throw new PriceRequestError(
          400,
          "이전 구조의 프로그램(REGULAR, CAMP)에는 기간을 추가할 수 없습니다. 신규 5개 프로그램에서 기간을 추가해 주세요.",
          "program_id"
        );
      }

      const duplicate = await tx.program_options.findFirst({
        where: { program_id: programId!, duration_weeks: weeks! },
        select: { id: true, is_active: true },
      });
      if (duplicate) {
        throw new PriceRequestError(
          409,
          duplicate.is_active
            ? `이미 ${weeks}주 기간이 있습니다. 가격은 해당 기간의 「가격 변경」에서 등록해 주세요.`
            : `이미 ${weeks}주 기간이 있습니다(사용 중지 상태). 「표시 설정」에서 다시 활성화해 주세요.`,
          "duration_weeks"
        );
      }

      let displayOrder = settings.data.display_order;
      if (settings.data.is_public && settings.data.is_active) {
        const count = await countPublicOptions(tx, programId!);
        if (count >= MAX_PUBLIC_OPTIONS) throw new PriceRequestError(409, publicLimitMessage(), "is_public");
      }
      if (settings.data.is_public && displayOrder === null) displayOrder = await nextDisplayOrder(tx, programId!);

      const option = await tx.program_options.create({
        data: {
          program_id: programId!,
          name: `${weeks}주`,
          duration_weeks: weeks!,
          is_active: settings.data.is_active,
          is_public: settings.data.is_public,
          display_order: displayOrder,
        },
        select: OPTION_SELECT,
      });
      await logOptionChange(tx, { adminId: admin.id, action: "CREATE", recordId: option.id, oldData: null, newData: option, ip });

      let createdPrice = null;
      if (price) {
        createdPrice = await tx.program_prices.create({
          data: {
            program_option_id: option.id,
            price: price.data.price,
            currency: price.data.currency,
            valid_from: dateOnly(price.data.valid_from),
            valid_until: price.data.valid_until ? dateOnly(price.data.valid_until) : null,
            is_active: price.data.is_active,
          },
          select: PRICE_SELECT,
        });
        await logPriceChange(tx, { adminId: admin.id, action: "CREATE", recordId: createdPrice.id, oldData: null, newData: createdPrice, ip });
      }

      return { option, createdPrice };
    });

    return NextResponse.json(
      {
        success: true,
        message: result.createdPrice
          ? `${weeks}주 기간과 가격이 등록되었습니다.`
          : `${weeks}주 기간이 등록되었습니다. 가격이 없어 홈페이지에는 표시되지 않습니다.`,
        option: serializeBigInt(result.option),
        price: result.createdPrice ? serializeBigInt(result.createdPrice) : null,
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
    if (error && typeof error === "object" && (error as { code?: unknown }).code === "P2002") {
      return NextResponse.json(errorBody({ duration_weeks: "이미 같은 주수의 기간이 있습니다." }), { status: 409 });
    }

    console.error("기간 등록 오류:", error);

    return NextResponse.json({ success: false, message: "기간 등록에 실패했습니다." }, { status: 500 });
  }
}
