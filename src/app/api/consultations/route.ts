import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { getAdminSessionFromRequest, adminUnauthorizedResponse } from "@/lib/adminApiAuth";
import type { Prisma } from "@/generated/prisma/client";
import {
  CONSULTATION_TYPE_PRESETS,
  isConsultationStatus,
  isCounterpartType,
  todayKst,
  validateConsultationInput,
  type ConsultationInput,
} from "@/lib/consultationValidation";
import {
  CONSULTATION_INCLUDE,
  ConsultationRequestError,
  consultationColumns,
  resolveConsultationRefs,
  validationErrorBody,
  dateOnly,
} from "@/lib/consultationRecords";
import { getConsultationFormOptions } from "@/lib/consultationOptions";

export const runtime = "nodejs";

/**
 * 상담의 program_code → programs.name 표시용 조회 (GET 응답에만 사용)
 * - consultations.program_code는 DB FK만 있고 Prisma relation이 없어 include로 가져올 수 없음
 * - 조회에 실패해도 상담 목록은 보여 줘야 하므로 오류는 로그만 남기고 빈 결과(→ 화면에서 코드 표시)
 */
async function loadProgramNames(codes: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(codes.filter((code): code is string => !!code)));
  const names = new Map<string, string>();
  if (unique.length === 0) return names;
  try {
    const programs = await prisma.programs.findMany({
      where: { code: { in: unique } },
      select: { code: true, name: true },
    });
    for (const program of programs) {
      if (program.name) names.set(program.code, program.name);
    }
  } catch (error) {
    console.error("상담 목록 프로그램명 조회 오류:", error);
  }
  return names;
}

/**
 * [Stage 5-B-2] 다음 상담일(next_consultation_date, @db.Date) 필터 조건
 * - 기준일: 한국 시간(Asia/Seoul) 오늘 — 기존 todayKst() 사용 (YYYY-MM-DD)
 * - @db.Date 값은 기존 저장 방식과 같은 dateOnly()("YYYY-MM-DDT00:00:00.000Z")로 만들어 날짜끼리만 비교
 *   → 서버 시간대·UTC 시각 차이로 하루가 밀리지 않음
 * - week: 오늘 ~ 이번 주 일요일 (지난 날짜는 포함하지 않음, 오늘이 일요일이면 오늘만)
 * 허용값이 아니거나 "all"이면 null (조건 없음)
 */
function followupCondition(followup: string): Prisma.consultationsWhereInput | null {
  const todayText = todayKst();
  const today = dateOnly(todayText);
  const DAY_MS = 24 * 60 * 60 * 1000;

  switch (followup) {
    case "today":
      return { next_consultation_date: today };
    case "tomorrow":
      return { next_consultation_date: new Date(today.getTime() + DAY_MS) };
    case "week": {
      // today는 UTC 자정으로 만든 한국 날짜이므로 getUTCDay()가 한국 기준 요일 (0 = 일요일)
      const daysToSunday = (7 - today.getUTCDay()) % 7;
      return { next_consultation_date: { gte: today, lte: new Date(today.getTime() + daysToSunday * DAY_MS) } };
    }
    case "overdue":
      return { next_consultation_date: { lt: today } };
    case "unspecified":
      return { next_consultation_date: null };
    default:
      return null;
  }
}

// 상담 목록 조회 (관리자 로그인 필요)
// GET /api/consultations?q=검색어&status=상태&counterpart=대상&type=유형
// - q: 학생 이름(한글·영문) / 학생번호 / 전화번호(학생·상담 상대·보호자) / 상담 내용 중 하나라도 포함하면 검색
// - status: new | in_progress | completed | cancelled (없거나 "all"이면 전체)
// - counterpart: student | guardian (없거나 "all"이면 전체)
// - type: 상담 유형(inquiry_type)과 정확히 일치 (없거나 "all"이면 전체)
// - [Stage 5-B-1] source: homepage → source = 'homepage' / admin → source IS NULL (관리자 등록, DB 값은 그대로) / 그 외·"all"이면 전체
// - [Stage 5-B-1] assigned: unassigned → assigned_admin_id IS NULL / 관리자 id → 그 관리자 / 그 외·"all"이면 전체
// - [Stage 5-B-2] followup: today | tomorrow | week(오늘~이번 주 일요일) | overdue(오늘 이전) | unspecified(NULL) / 그 외·"all"이면 전체
//   모든 조건은 AND로 함께 적용
// 정렬: 최근 접수·등록순(created_at) → id 역순 (홈페이지 신규 상담이 바로 보이도록)
// 응답의 각 상담에 program_name(programs.name, 없으면 null)을 붙임
// [Stage 5-B-1] 응답에 담당자 필터 선택지 adminOptions(기존 getConsultationFormOptions()의 admins)를 붙임
export async function GET(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  try {
    const { searchParams } = request.nextUrl;
    const q = (searchParams.get("q") ?? "").trim().slice(0, 100);
    const status = (searchParams.get("status") ?? "").trim();
    const counterpart = (searchParams.get("counterpart") ?? "").trim();
    const type = (searchParams.get("type") ?? "").trim().slice(0, 50);
    const source = (searchParams.get("source") ?? "").trim();
    const assigned = (searchParams.get("assigned") ?? "").trim();
    const followup = (searchParams.get("followup") ?? "").trim();

    const conditions: Prisma.consultationsWhereInput[] = [];

    if (isConsultationStatus(status)) conditions.push({ status });
    if (isCounterpartType(counterpart)) conditions.push({ counterpart_type: counterpart });
    if (type && type !== "all") conditions.push({ inquiry_type: type });

    // [Stage 5-B-1] 접수 경로 — 관리자 등록 상담은 source가 NULL (값을 바꾸지 않고 조회 조건으로만 처리)
    if (source === "homepage") conditions.push({ source: "homepage" });
    else if (source === "admin") conditions.push({ source: null });

    // [Stage 5-B-1] 담당자
    if (assigned === "unassigned") conditions.push({ assigned_admin_id: null });
    else if (/^\d{1,18}$/.test(assigned)) conditions.push({ assigned_admin_id: BigInt(assigned) });

    // [Stage 5-B-2] 다음 상담일
    const followupWhere = followupCondition(followup);
    if (followupWhere) conditions.push(followupWhere);

    if (q) {
      const contains = { contains: q, mode: "insensitive" as const };
      // 전화번호는 하이픈·공백을 뺀 형태로도 검색 (학생 목록과 같은 방식)
      const phoneVariants = Array.from(new Set([q, q.replace(/[\s-]/g, "")])).filter(Boolean);
      const phoneConditions: Prisma.consultationsWhereInput[] = phoneVariants.flatMap((value) => [
        { phone: { contains: value } },
        { students: { is: { phone: { contains: value } } } },
        { guardians: { is: { phone: { contains: value } } } },
      ]);

      conditions.push({
        OR: [
          { students: { is: { name: contains } } },
          { students: { is: { name_en: contains } } },
          { students: { is: { student_no: contains } } },
          { name: contains },
          { message: contains },
          ...phoneConditions,
        ],
      });
    }

    const [consultations, typeRows, formOptions] = await Promise.all([
      prisma.consultations.findMany({
        where: conditions.length ? { AND: conditions } : undefined,
        include: CONSULTATION_INCLUDE,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
      }),
      prisma.consultations.findMany({
        where: { inquiry_type: { not: null } },
        distinct: ["inquiry_type"],
        select: { inquiry_type: true },
        orderBy: { inquiry_type: "asc" },
      }),
      // [Stage 5-B-1] 담당자 필터 선택지 (상담 등록·수정 화면과 같은 관리자 목록, 비밀번호 등은 조회하지 않음)
      getConsultationFormOptions(),
    ]);

    const typeOptions = Array.from(
      new Set<string>([
        ...CONSULTATION_TYPE_PRESETS,
        ...typeRows
          .map((row: { inquiry_type: string | null }) => row.inquiry_type)
          .filter((value: string | null): value is string => !!value),
      ])
    );

    const programNames = await loadProgramNames(
      consultations.map((consultation: { program_code: string | null }) => consultation.program_code)
    );

    return NextResponse.json({
      success: true,
      count: consultations.length,
      typeOptions,
      adminOptions: formOptions.admins,
      consultations: serializeBigInt(consultations).map((consultation) => ({
        ...consultation,
        program_name: consultation.program_code ? programNames.get(consultation.program_code) ?? null : null,
      })),
    });
  } catch (error) {
    console.error("상담 목록 조회 오류:", error);

    return NextResponse.json(
      {
        success: false,
        message: "상담 목록을 불러오지 못했습니다.",
      },
      { status: 500 }
    );
  }
}

// 상담 등록 (관리자 로그인 필요)
// POST /api/consultations
// 본문: student_id, counterpart_type(student|guardian), guardian_id(보호자 상담일 때),
//       consulted_at, inquiry_type, message, result?, next_consultation_date?, status, assigned_admin_id?
// - 학생·보호자·담당자는 DB에서 다시 확인 (보호자는 그 학생과 연결된 보호자만)
// - assigned_admin_id를 보내지 않으면 로그인한 관리자를 담당자로 저장, 빈 값("")이면 미지정
export async function POST(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  let body: ConsultationInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "요청 형식이 올바르지 않습니다.",
      },
      { status: 400 }
    );
  }

  const { data, errors } = validateConsultationInput(body && typeof body === "object" ? body : {});
  if (Object.keys(errors).length > 0) {
    return NextResponse.json(validationErrorBody(errors), { status: 400 });
  }

  // 담당자 기본값: 로그인한 관리자
  const sessionAdminId = /^\d{1,18}$/.test(session.id) ? session.id : null;
  const assignedAdminId = data.assigned_admin_id === undefined ? sessionAdminId : data.assigned_admin_id;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const refs = await resolveConsultationRefs(tx, data, assignedAdminId);
      return tx.consultations.create({
        data: consultationColumns(data, refs),
        select: { id: true },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "상담이 등록되었습니다.",
        consultation: { id: created.id.toString() },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ConsultationRequestError) {
      return NextResponse.json(
        error.field ? validationErrorBody({ [error.field]: error.message }) : { success: false, message: error.message },
        { status: error.status }
      );
    }

    console.error("상담 등록 오류:", error);

    return NextResponse.json(
      {
        success: false,
        message: "상담 등록에 실패했습니다.",
      },
      { status: 500 }
    );
  }
}
