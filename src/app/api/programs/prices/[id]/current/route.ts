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
import { formatWon, planCurrentPrice, todayKst } from "@/lib/programPriceValidation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/programs/prices/[id]/current 이 가격을 "현재 적용 가격"으로 선택 (SUPER_ADMIN, ADMIN)
//
// 가격 이력 수정(PUT /api/programs/prices/[id])과 다른 동작입니다. 금액은 바꾸지 않고, 오늘(한국 시간)부터
// 이 가격이 적용되도록 같은 기간 옵션의 가격 상태를 한 번에 정리합니다. (규칙: planCurrentPrice 참고)
//   1. 오늘 적용 중이던 다른 활성 가격 → 비활성 (기간은 그대로)
//   2. 선택한 가격 → 활성, 오늘을 포함하도록 필요한 만큼만 기간 조정
//   3. 저장 후 활성 가격끼리 기간이 겹치지 않는지, 오늘 적용 가격이 선택한 가격 1건인지 다시 확인
//   4. 바뀐 행마다 admin_logs 기록 (action: SET_CURRENT)
// 모두 하나의 트랜잭션입니다. 가격 행은 삭제하지 않습니다.
export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  const { id } = await params;
  const priceId = parseId(id);
  if (priceId === null) {
    return NextResponse.json({ success: false, message: "올바르지 않은 가격 ID입니다." }, { status: 400 });
  }

  try {
    const admin = await getActiveAdmin(session);
    if (!admin || !canManagePrices(admin.role)) {
      return NextResponse.json(
        { success: false, message: "현재 적용 가격 변경은 관리자(SUPER_ADMIN, ADMIN)만 할 수 있습니다." },
        { status: 403 }
      );
    }

    const ip = clientIp(request);
    const today = todayKst();

    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.program_prices.findUnique({ where: { id: priceId }, select: PRICE_SELECT });
      if (!target) throw new PriceRequestError(404, "가격 정보를 찾을 수 없습니다.");

      // 같은 기간 옵션의 가격 저장(등록·수정·현재 선택)은 한 번에 하나씩
      await lockProgramOption(tx, target.program_option_id);

      const rows = await tx.program_prices.findMany({
        where: { program_option_id: target.program_option_id },
        select: PRICE_SELECT,
      });
      const plan = planCurrentPrice(
        rows.map((row: { id: bigint; price: unknown; valid_from: Date; valid_until: Date | null; is_active: boolean }) => ({
          id: row.id.toString(),
          price: String(row.price),
          valid_from: dateText(row.valid_from) as string,
          valid_until: dateText(row.valid_until),
          is_active: row.is_active,
        })),
        priceId.toString(),
        today
      );
      if (!plan) throw new PriceRequestError(404, "가격 정보를 찾을 수 없습니다.");
      if (plan.alreadyCurrent) return { plan, deactivated: [] as { id: string; price: string }[], saved: target };

      // 1. 오늘 적용 중이던 다른 가격 비활성 (기간 보존)
      const deactivated: { id: string; price: string }[] = [];
      for (const rowId of plan.deactivateIds) {
        const before = rows.find((row: { id: bigint }) => row.id.toString() === rowId)!;
        const after = await tx.program_prices.update({
          where: { id: before.id },
          data: { is_active: false },
          select: PRICE_SELECT,
        });
        await logPriceChange(tx, { adminId: admin.id, action: "SET_CURRENT", recordId: before.id, oldData: before, newData: after, ip });
        deactivated.push({ id: rowId, price: String(before.price) });
      }

      // 2. 선택한 가격 활성 + 오늘을 포함하는 기간
      const saved = await tx.program_prices.update({
        where: { id: priceId },
        data: {
          is_active: true,
          valid_from: dateOnly(plan.valid_from),
          valid_until: plan.valid_until ? dateOnly(plan.valid_until) : null,
        },
        select: PRICE_SELECT,
      });
      await logPriceChange(tx, { adminId: admin.id, action: "SET_CURRENT", recordId: priceId, oldData: target, newData: saved, ip });

      // 3. 저장 결과 확인 (어긋나면 전체 취소)
      const overlaps = await findOverlappingPrices(tx, target.program_option_id, plan.valid_from, plan.valid_until, priceId);
      if (overlaps.length > 0) {
        throw new PriceRequestError(409, "적용 기간이 겹치는 다른 활성 가격이 있어 현재 가격으로 지정할 수 없습니다. 가격 이력을 확인해 주세요.");
      }
      const current = await findCurrentPrice(tx, target.program_option_id, today);
      if (!current || current.id !== priceId) {
        throw new PriceRequestError(409, "현재 적용 가격을 확인하지 못했습니다. 가격 이력을 확인해 주세요.");
      }

      return { plan, deactivated, saved };
    });

    const priceText = formatWon(String(result.saved.price));
    let message: string;
    if (result.plan.alreadyCurrent) {
      message = `${priceText}은(는) 이미 현재 적용 중인 가격입니다.`;
    } else {
      message = `${priceText}을(를) 현재 적용 가격으로 변경했습니다.`;
      if (result.deactivated.length > 0) {
        message += ` 기존 가격 ${result.deactivated.map((row: { id: string; price: string }) => formatWon(row.price)).join(", ")}은(는) 비활성 처리했습니다.`;
      }
      if (result.plan.periodChanged) {
        message += ` 적용 기간: ${result.plan.valid_from} ~ ${result.plan.valid_until ?? "종료일 없음"}`;
      }
    }

    return NextResponse.json({
      success: true,
      changed: !result.plan.alreadyCurrent,
      message,
      price: serializeBigInt(result.saved),
      deactivated: result.deactivated.map((row: { id: string; price: string }) => row.id),
    });
  } catch (error) {
    if (error instanceof PriceRequestError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }

    console.error("현재 적용 가격 변경 오류:", error);

    return NextResponse.json({ success: false, message: "현재 적용 가격을 변경하지 못했습니다." }, { status: 500 });
  }
}
