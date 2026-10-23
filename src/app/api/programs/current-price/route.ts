import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { getAdminSessionFromRequest, adminUnauthorizedResponse } from "@/lib/adminApiAuth";
import { findCurrentPrice, parseId } from "@/lib/programPrices";
import { todayKst } from "@/lib/programPriceValidation";

export const runtime = "nodejs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/programs/current-price?optionId=기간옵션ID&date=YYYY-MM-DD (관리자 로그인 필요)
// 수납 등록 화면에서 프로그램·기간을 고르면 이 API로 기본 수강료를 가져옵니다.
// - date를 생략하면 오늘(한국 시간). 보통 수강 시작일을 넘깁니다.
// - 적용 중인 가격이 없으면 price: null (화면에서 "가격 미설정" 안내)
// 수납 저장 API도 같은 함수(findCurrentPrice)로 서버에서 다시 계산합니다. (화면이 보낸 수강료를 그대로 믿지 않음)
export async function GET(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  const { searchParams } = request.nextUrl;
  const optionId = parseId(searchParams.get("optionId"));
  const date = (searchParams.get("date") ?? "").trim() || todayKst();

  if (optionId === null) {
    return NextResponse.json({ success: false, message: "기간 옵션을 선택해 주세요." }, { status: 400 });
  }
  if (!DATE_RE.test(date) || Number.isNaN(new Date(`${date}T00:00:00.000Z`).getTime())) {
    return NextResponse.json({ success: false, message: "날짜 형식이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const option = await prisma.program_options.findUnique({
      where: { id: optionId },
      select: {
        id: true,
        name: true,
        duration_weeks: true,
        is_active: true,
        programs: { select: { id: true, code: true, name: true, is_active: true } },
      },
    });
    if (!option) {
      return NextResponse.json({ success: false, message: "기간 옵션을 찾을 수 없습니다." }, { status: 404 });
    }

    const price = await findCurrentPrice(prisma, optionId, date);

    return NextResponse.json({
      success: true,
      date,
      program_option: serializeBigInt(option),
      price: price ? serializeBigInt(price) : null,
      message: price ? undefined : "이 날짜에 적용되는 가격이 없습니다. 프로그램 관리에서 가격을 먼저 등록해 주세요.",
    });
  } catch (error) {
    console.error("적용 가격 조회 오류:", error);

    return NextResponse.json({ success: false, message: "가격 정보를 불러오지 못했습니다." }, { status: 500 });
  }
}
