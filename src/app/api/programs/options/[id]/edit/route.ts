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
  findCurrentPrice,
  findOverlappingPrices,
  lockProgramOption,
  logPriceChange,
  parseId,
} from "@/lib/programPrices";
import { formatWon, todayKst, validatePriceInput, type PriceInput } from "@/lib/programPriceValidation";
import {
  NO_PRICE_PUBLIC_MESSAGE,
  publicLimitMessage,
  validateOptionSettings,
  type OptionSettingsInput,
} from "@/lib/programOptionValidation";
import { OPTION_SELECT, countPublicOptions, hasUsablePrice, lockProgram, logOptionChange, nextDisplayOrder } from "@/lib/programOptions";
import { planPriceEdit, type PlanPriceRow } from "@/lib/priceEditPlan";
import { MAX_PUBLIC_OPTIONS, isProgramCode } from "@/config/programPricing";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type Body = Omit<PriceInput, "is_active"> &
  OptionSettingsInput & {
    /** 수정 화면에 불러온 기준 가격 id (현재 적용 가격 또는 적용 예정 가격). 없으면 null */
    base_price_id?: unknown;
  };

function errorBody(errors: Record<string, string>) {
  return { success: false, message: Object.values(errors)[0], errors };
}

type DbPrice = { id: bigint; price: unknown; currency: string; valid_from: Date; valid_until: Date | null; is_active: boolean };

function toPlanRow(row: DbPrice): PlanPriceRow {
  return {
    id: row.id.toString(),
    price: String(row.price),
    currency: String(row.currency),
    valid_from: dateText(row.valid_from) as string,
    valid_until: dateText(row.valid_until),
    is_active: row.is_active,
  };
}

// POST /api/programs/options/[id]/edit 기간 「수정」 — 가격 + 홈페이지 표시 설정을 한 번에 저장 (SUPER_ADMIN, ADMIN)
// 본문: price, currency, valid_from, valid_until?, base_price_id?, is_active(기간 사용), is_public, display_order?
//
// 가격 이력 보존 (planPriceEdit 규칙, 기존 행 삭제·금액 덮어쓰기 없음)
//   - 금액·통화·시작일·종료일이 같으면 가격은 그대로
//   - 종료일만 다르면 기준 가격 행의 종료일만 조정
//   - 금액 등이 바뀌면 새 가격 행 추가 + 겹치는 기존 활성 가격은 새 시작일 전날로 종료하거나 비활성 처리
// 저장 후 활성 가격끼리 기간이 겹치지 않는지 다시 확인 (겹치면 전체 취소)
// 홈페이지 표시: 프로그램별 최대 4개, 새로 켤 때는 적용 중·예정인 활성 가격 필요, 이전 REGULAR/CAMP 는 불가
// 모든 변경은 하나의 트랜잭션, 변경된 행마다 admin_logs 기록
export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  const { id } = await params;
  const optionId = parseId(id);
  if (optionId === null) {
    return NextResponse.json({ success: false, message: "올바르지 않은 기간 ID입니다." }, { status: 400 });
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
        { success: false, message: "가격·표시 설정 변경은 관리자(SUPER_ADMIN, ADMIN)만 할 수 있습니다." },
        { status: 403 }
      );
    }

    const settings = validateOptionSettings(body);
    const errors: Record<string, string> = { ...settings.errors };

    const hasPrice = !(body.price === undefined || body.price === null || (typeof body.price === "string" && body.price.trim() === ""));
    const basePriceId = body.base_price_id === undefined || body.base_price_id === null || body.base_price_id === "" ? null : parseId(body.base_price_id);
    if (body.base_price_id !== undefined && body.base_price_id !== null && body.base_price_id !== "" && basePriceId === null) {
      errors.price = "기준 가격 정보가 올바르지 않습니다. 화면을 새로 고친 뒤 다시 시도해 주세요.";
    }
    if (!hasPrice && basePriceId !== null) errors.price = "금액을 입력해 주세요.";

    // 새로 추가하는 가격은 항상 활성 (잘못 입력한 이력 행의 비활성화는 가격 이력의 「정정」에서)
    const price = hasPrice ? validatePriceInput({ ...body, is_active: true }) : null;
    if (price) Object.assign(errors, price.errors);

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(errorBody(errors), { status: 400 });
    }

    const ip = clientIp(request);
    const today = todayKst();

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.program_options.findUnique({ where: { id: optionId }, select: OPTION_SELECT });
      if (!current) throw new PriceRequestError(404, "기간 정보를 찾을 수 없습니다.");

      const program = await lockProgram(tx, current.program_id);
      if (!program) throw new PriceRequestError(404, "프로그램을 찾을 수 없습니다.");
      await lockProgramOption(tx, optionId);

      if (settings.data.is_public && !isProgramCode(program.code)) {
        throw new PriceRequestError(400, "이전 구조의 프로그램(REGULAR, CAMP)은 홈페이지에 표시하지 않습니다.", "is_public");
      }

      // ── 1. 가격 ──
      let priceSummary = "";
      if (price) {
        const rows = (await tx.program_prices.findMany({ where: { program_option_id: optionId }, select: PRICE_SELECT })) as DbPrice[];
        const planRows = rows.map(toPlanRow);
        const base = basePriceId !== null ? planRows.find((row) => row.id === basePriceId.toString()) ?? null : null;
        if (basePriceId !== null && !base) {
          throw new PriceRequestError(409, "기준 가격이 이 기간의 가격이 아닙니다. 화면을 새로 고친 뒤 다시 시도해 주세요.", "price");
        }

        const plan = planPriceEdit(planRows, base, price.data);
        if (plan.kind === "error") throw new PriceRequestError(409, plan.message, "valid_until");

        if (plan.kind === "adjustUntil") {
          const before = rows.find((row) => row.id.toString() === plan.id)!;
          const after = await tx.program_prices.update({
            where: { id: before.id },
            data: { valid_until: plan.valid_until ? dateOnly(plan.valid_until) : null },
            select: PRICE_SELECT,
          });
          await logPriceChange(tx, { adminId: admin.id, action: "UPDATE", recordId: before.id, oldData: before, newData: after, ip });
          priceSummary = `적용 종료일을 ${plan.valid_until ?? "종료일 없음"}(으)로 변경했습니다.`;
        }

        if (plan.kind === "newPrice") {
          for (const item of plan.close) {
            const before = rows.find((row) => row.id.toString() === item.id)!;
            const after = await tx.program_prices.update({
              where: { id: before.id },
              data: { valid_until: dateOnly(item.valid_until) },
              select: PRICE_SELECT,
            });
            await logPriceChange(tx, { adminId: admin.id, action: "UPDATE", recordId: before.id, oldData: before, newData: after, ip });
          }
          for (const item of plan.deactivate) {
            const before = rows.find((row) => row.id.toString() === item.id)!;
            const after = await tx.program_prices.update({ where: { id: before.id }, data: { is_active: false }, select: PRICE_SELECT });
            await logPriceChange(tx, { adminId: admin.id, action: "UPDATE", recordId: before.id, oldData: before, newData: after, ip });
          }
          const created = await tx.program_prices.create({
            data: {
              program_option_id: optionId,
              price: price.data.price,
              currency: price.data.currency,
              valid_from: dateOnly(price.data.valid_from),
              valid_until: price.data.valid_until ? dateOnly(price.data.valid_until) : null,
              is_active: true,
            },
            select: PRICE_SELECT,
          });
          await logPriceChange(tx, { adminId: admin.id, action: "CREATE", recordId: created.id, oldData: null, newData: created, ip });

          // 저장 결과 확인: 새 가격과 겹치는 다른 활성 가격이 없어야 함
          const overlaps = await findOverlappingPrices(tx, optionId, price.data.valid_from, price.data.valid_until, created.id);
          if (overlaps.length > 0) {
            throw new PriceRequestError(409, "적용 기간이 겹치는 다른 활성 가격이 남아 있어 저장하지 못했습니다. 가격 이력을 확인해 주세요.", "valid_from");
          }

          const parts = [`새 가격 ${formatWon(price.data.price)}(${price.data.valid_from}~)을 등록했습니다.`];
          if (plan.close.length > 0) parts.push(`기존 가격 ${plan.close.map((c) => formatWon(c.price)).join(", ")}은(는) ${plan.close[0].valid_until}까지로 종료되어 이력에 남습니다.`);
          if (plan.deactivate.length > 0) parts.push(`겹치는 가격 ${plan.deactivate.map((d) => formatWon(d.price)).join(", ")}은(는) 비활성으로 이력에 남습니다.`);
          priceSummary = parts.join(" ");
        }
      }

      // ── 2. 홈페이지 표시·순서·사용 여부 ──
      const data = settings.data;
      if (data.is_public && data.is_active) {
        const count = await countPublicOptions(tx, current.program_id, optionId);
        if (count >= MAX_PUBLIC_OPTIONS) throw new PriceRequestError(409, publicLimitMessage(), "is_public");
      }
      if (data.is_public && !current.is_public && !(await hasUsablePrice(tx, optionId, today))) {
        throw new PriceRequestError(409, NO_PRICE_PUBLIC_MESSAGE, "is_public");
      }
      let displayOrder = data.display_order;
      if (data.is_public && displayOrder === null) {
        displayOrder = current.display_order ?? (await nextDisplayOrder(tx, current.program_id));
      }

      const settingsChanged =
        current.is_public !== data.is_public || current.is_active !== data.is_active || current.display_order !== displayOrder;
      let saved = current;
      if (settingsChanged) {
        saved = await tx.program_options.update({
          where: { id: optionId },
          data: { is_public: data.is_public, display_order: displayOrder, is_active: data.is_active, updated_at: new Date() },
          select: OPTION_SELECT,
        });
        await logOptionChange(tx, { adminId: admin.id, action: "UPDATE", recordId: optionId, oldData: current, newData: saved, ip });
      }

      const currentPrice = await findCurrentPrice(tx, optionId, today);
      return { saved, priceSummary, settingsChanged, currentPrice };
    });

    const messages: string[] = [];
    if (result.priceSummary) messages.push(result.priceSummary);
    if (result.settingsChanged) messages.push("홈페이지 표시·사용 설정을 저장했습니다.");
    if (messages.length === 0) messages.push("변경된 내용이 없습니다.");
    if (result.saved.is_public && result.saved.is_active && !result.currentPrice) {
      messages.push("※ 오늘 적용되는 가격이 없어 홈페이지에는 아직 표시되지 않습니다.");
    }

    return NextResponse.json({
      success: true,
      message: `${result.saved.duration_weeks}주: ${messages.join(" ")}`,
      option: serializeBigInt(result.saved),
    });
  } catch (error) {
    if (error instanceof PriceRequestError) {
      return NextResponse.json(
        error.field ? errorBody({ [error.field]: error.message }) : { success: false, message: error.message },
        { status: error.status }
      );
    }

    console.error("기간 수정 저장 오류:", error);

    return NextResponse.json({ success: false, message: "수정 내용을 저장하지 못했습니다." }, { status: 500 });
  }
}
