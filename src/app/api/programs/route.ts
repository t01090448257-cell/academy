import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { getAdminSessionFromRequest, adminUnauthorizedResponse } from "@/lib/adminApiAuth";
import { canManagePrices, getActiveAdmin } from "@/lib/adminRoles";
import { PRICE_SELECT } from "@/lib/programPrices";
import { priceState, todayKst } from "@/lib/programPriceValidation";
import { LEGACY_PROGRAM_CODES, MAX_PUBLIC_OPTIONS, PROGRAM_CODES } from "@/config/programPricing";

export const runtime = "nodejs";

/** 직렬화된 가격·기간 옵션·프로그램 (BigInt·Decimal·Date → 문자열) */
interface PriceRow {
  id: string;
  program_option_id: string;
  price: string;
  currency: string;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}
interface OptionRow {
  id: string;
  name: string;
  duration_weeks: number;
  is_active: boolean;
  is_public: boolean;
  display_order: number | null;
  program_prices: PriceRow[];
}
interface ProgramRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  program_options: OptionRow[];
}

// GET /api/programs 프로그램 → 기간 옵션 → 가격 이력 (관리자 로그인 필요)
// - 프로그램·기간 옵션은 DB(programs, program_options)에 있는 그대로 조회 (새로 만들지 않음)
// - 각 기간 옵션에 오늘(한국 시간) 적용되는 가격(current_price_id)을 함께 표시
// - canManage: 로그인한 관리자가 가격을 등록·수정할 수 있는지 (SUPER_ADMIN, ADMIN)
// - 순서: 신규 5개 프로그램(정규반 3 → 캠프반 2) → 이전 REGULAR/CAMP → 그 밖의 프로그램
//   (수납 등록 화면도 이 목록을 사용하므로 기존 프로그램도 그대로 포함)
// - 기간 옵션마다 홈페이지 표시(is_public)·표시 순서(display_order) 포함
export async function GET(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  try {
    const [admin, programs] = await Promise.all([
      getActiveAdmin(session),
      prisma.programs.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          is_active: true,
          program_options: {
            orderBy: [{ duration_weeks: "asc" }, { id: "asc" }],
            select: {
              id: true,
              name: true,
              duration_weeks: true,
              is_active: true,
              is_public: true,
              display_order: true,
              program_prices: {
                orderBy: [{ valid_from: "desc" }, { id: "desc" }],
                select: PRICE_SELECT,
              },
            },
          },
        },
      }),
    ]);

    const today = todayKst();
    const rows = serializeBigInt(programs) as unknown as ProgramRow[];
    const rank = (code: string) => {
      const order = [...PROGRAM_CODES, ...LEGACY_PROGRAM_CODES] as readonly string[];
      const index = order.indexOf(code);
      return index === -1 ? order.length : index;
    };
    rows.sort((a, b) => rank(a.code) - rank(b.code) || (BigInt(a.id) < BigInt(b.id) ? -1 : 1));

    const data = rows.map((program: ProgramRow) => ({
      ...program,
      program_options: program.program_options.map((option: OptionRow) => {
        const current = option.program_prices.find((row: PriceRow) => priceState(row, today) === "current");
        return { ...option, current_price_id: current ? current.id : null };
      }),
    }));

    return NextResponse.json({
      success: true,
      today,
      canManage: canManagePrices(admin?.role),
      maxPublicOptions: MAX_PUBLIC_OPTIONS,
      programs: data,
    });
  } catch (error) {
    console.error("프로그램 조회 오류:", error);

    return NextResponse.json(
      {
        success: false,
        message: "프로그램 정보를 불러오지 못했습니다.",
      },
      { status: 500 }
    );
  }
}
