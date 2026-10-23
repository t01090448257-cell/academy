// src/app/api/public/consultations/route.ts
// ─────────────────────────────────────────────────────────────────────
// POST /api/public/consultations — 홈페이지 상담 신청 접수 (공개 API, 로그인 불필요)
//
// - 관리자용 /api/consultations 와 완전히 분리된 파일입니다. (관리자 인증·학생 연결 규칙을 사용하지 않음)
// - 서버가 고정하는 값: source = "homepage", status = "new"
//   student_id / guardian_id / assigned_admin_id = NULL, counterpart_type = DB 기본값("student")
// - 과정·기간은 클라이언트 값을 그대로 믿지 않고 DB(programs → program_options → program_prices)로 다시 확인합니다.
//   (홈페이지 학비표·맞춤견적서와 같은 기준: 활성 과정 + 활성·홈페이지 표시 기간 + 오늘 적용 중인 활성 KRW 가격)
// - 응답에는 상담 ID 등 내부 정보를 담지 않고, DB 오류 상세는 서버 로그에만 남깁니다.
// - POST만 정의합니다. (다른 메서드는 Next.js가 405로 응답)
// ─────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateOnly, findCurrentPrice } from "@/lib/programPrices";
import { todayKst } from "@/lib/programPriceValidation";
import { isCourseId, STAY_OPTION_IDS } from "@/config/courses";
import { COURSE_PROGRAM_CODES, isProgramCode, type ProgramCode } from "@/config/programPricing";
import { INTEREST_IDS } from "@/config/consultation";
import { isLocale } from "@/config/i18n";

export const runtime = "nodejs";

/* ------------------------------------------------------------------ */
/* 허용값                                                               */
/* ------------------------------------------------------------------ */

// 상담 팝업(src/components/common/ConsultationModal.tsx)의 AGE_GROUP_IDS / ENGLISH_LEVEL_IDS 와 같은 값입니다.
// 그 파일은 "use client" 모듈이라 서버 라우트에서 import하면 값이 아닌 클라이언트 참조가 되므로 여기서 같은 값을 둡니다.
// 팝업의 선택지를 바꾸면 이 두 목록도 함께 바꿔 주세요.
const AGE_GROUP_IDS = ["adult", "teen", "child", "parent"] as const;
const ENGLISH_LEVEL_IDS = ["beginner", "intermediate", "advanced"] as const;

/** 길이 상한 (DB 컬럼 길이 기준, message는 Text이므로 화면 입력 상한) */
const LIMITS = {
  name: 100, // VarChar(100)
  phone: 30, // VarChar(30)
  email: 255, // VarChar(255)
  message: 5000, // Text
} as const;

/** 요청 본문 최대 크기 (비정상적으로 큰 요청 거부) */
const MAX_BODY_BYTES = 20_000;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** 숫자·공백·+·-·()·. 만 허용 (국가번호 포함 해외 번호 고려) */
const PHONE_CHARS_RE = /^[0-9+\-\s().]+$/;

const MESSAGES = {
  badRequest: "요청 형식이 올바르지 않습니다.",
  serverError: "상담 신청 처리 중 오류가 발생했습니다.",
} as const;

class PublicInputError extends Error {}

/* ------------------------------------------------------------------ */
/* 입력값 정리                                                          */
/* ------------------------------------------------------------------ */

/** 한 줄 문자열: 앞뒤 공백 제거 + 연속 공백 하나로. 빈 값·null·undefined → null. 문자열이 아니면 오류 */
function optionalLine(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new PublicInputError(`${field} 값이 올바르지 않습니다.`);
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned : null;
}

/** 여러 줄 문자열: 줄바꿈 유지, 앞뒤 공백만 제거 */
function optionalMultiline(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new PublicInputError(`${field} 값이 올바르지 않습니다.`);
  const cleaned = value.replace(/\r\n/g, "\n").trim();
  return cleaned ? cleaned : null;
}

/** 허용 목록 중 하나 (빈 값은 null) */
function optionalEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T | null {
  const text = optionalLine(value, field);
  if (text === null) return null;
  if (!(allowed as readonly string[]).includes(text)) throw new PublicInputError(`${field} 값이 올바르지 않습니다.`);
  return text as T;
}

/** 실제 존재하는 날짜(YYYY-MM-DD)인지 */
function isValidDate(value: string): boolean {
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d && y >= 2000 && y <= 2100
  );
}

/** course: 홈페이지 과정 ID(intensiveEsl 등) 또는 신규 5개 프로그램 코드(REGULAR_ESL 등) → 프로그램 코드 */
function toProgramCode(value: unknown): ProgramCode | null {
  const text = optionalLine(value, "과정");
  if (text === null) return null;
  if (isCourseId(text)) return COURSE_PROGRAM_CODES[text];
  if (isProgramCode(text)) return text;
  // 이전 구조의 REGULAR / CAMP 등 그 밖의 값은 받지 않음
  throw new PublicInputError("선택한 과정을 확인할 수 없습니다.");
}

interface CleanInput {
  name: string;
  phone: string;
  email: string | null;
  ageGroup: (typeof AGE_GROUP_IDS)[number] | null;
  programCode: ProgramCode | null;
  durationWeeks: number | null;
  stayOption: (typeof STAY_OPTION_IDS)[number] | null;
  startDate: string | null;
  englishLevel: (typeof ENGLISH_LEVEL_IDS)[number] | null;
  cebuMonthStay: boolean;
  localSchool: boolean;
  message: string | null;
  locale: string | null;
}

function validateInput(body: Record<string, unknown>): CleanInput {
  // 이름 (필수)
  const name = optionalLine(body.name, "이름");
  if (!name) throw new PublicInputError("이름을 입력해 주세요.");
  if (name.length > LIMITS.name) throw new PublicInputError(`이름은 ${LIMITS.name}자 이내로 입력해 주세요.`);

  // 연락처 (필수, 기본 형식: 허용 문자 + 숫자 7~15자리)
  const phone = optionalLine(body.phone, "연락처");
  if (!phone) throw new PublicInputError("연락처를 입력해 주세요.");
  const digits = phone.replace(/\D/g, "");
  if (phone.length > LIMITS.phone || !PHONE_CHARS_RE.test(phone) || digits.length < 7 || digits.length > 15) {
    throw new PublicInputError("연락처 형식이 올바르지 않습니다.");
  }

  // 이메일 (선택)
  const email = optionalLine(body.email, "이메일");
  if (email !== null && (email.length > LIMITS.email || !EMAIL_RE.test(email))) {
    throw new PublicInputError("이메일 형식이 올바르지 않습니다.");
  }

  // 과정 / 기간 (선택, DB 검증은 저장 직전에 수행)
  const programCode = toProgramCode(body.course);
  let durationWeeks: number | null = null;
  if (body.durationWeeks !== undefined && body.durationWeeks !== null && body.durationWeeks !== "") {
    if (typeof body.durationWeeks !== "number" || !Number.isInteger(body.durationWeeks) || body.durationWeeks <= 0 || body.durationWeeks > 104) {
      throw new PublicInputError("연수 기간이 올바르지 않습니다.");
    }
    durationWeeks = body.durationWeeks;
  }
  if (durationWeeks !== null && programCode === null) {
    throw new PublicInputError("연수 기간을 선택하려면 과정을 먼저 선택해 주세요.");
  }

  // 희망 시작일 (선택)
  const startDate = optionalLine(body.startDate, "희망 시작일");
  if (startDate !== null && !isValidDate(startDate)) {
    throw new PublicInputError("희망 시작일 형식이 올바르지 않습니다. (예: 2026-11-02)");
  }

  // 허용 목록 값 (선택)
  const ageGroup = optionalEnum(body.ageGroup, AGE_GROUP_IDS, "구분/연령");
  const englishLevel = optionalEnum(body.englishLevel, ENGLISH_LEVEL_IDS, "영어 수준");
  const stayOption = optionalEnum(body.stayOption, STAY_OPTION_IDS, "숙박");

  // 관심 있는 경험: 알려진 값만 반영, 나머지는 무시
  if (body.interests !== undefined && body.interests !== null && !Array.isArray(body.interests)) {
    throw new PublicInputError("관심 있는 경험 값이 올바르지 않습니다.");
  }
  const interests = Array.isArray(body.interests)
    ? body.interests.filter((item): item is string => typeof item === "string" && (INTEREST_IDS as readonly string[]).includes(item))
    : [];

  // 문의사항 (선택)
  const message = optionalMultiline(body.message, "문의사항");
  if (message !== null && message.length > LIMITS.message) {
    throw new PublicInputError(`문의사항은 ${LIMITS.message.toLocaleString()}자 이내로 입력해 주세요.`);
  }

  // 언어 (선택): 사이트 locale(config/i18n.ts)만 저장, 그 밖의 값은 저장하지 않음
  const localeText = optionalLine(body.locale, "언어");
  const locale = localeText !== null && isLocale(localeText) ? localeText : null;

  return {
    name,
    phone,
    email,
    ageGroup,
    programCode,
    durationWeeks,
    stayOption,
    startDate,
    englishLevel,
    cebuMonthStay: interests.includes("cebuMonthStay"),
    localSchool: interests.includes("localSchool"),
    message,
    locale,
  };
}

/* ------------------------------------------------------------------ */
/* DB 검증: 과정·기간이 홈페이지에 실제로 공개된 값인지                    */
/* ------------------------------------------------------------------ */

/**
 * 1. 과정: 존재하는 활성 프로그램
 * 2~3. 기간: 그 프로그램의 활성 + 홈페이지 표시(is_public) 기간
 * 4~5. 가격: 오늘(한국 시간) 적용 중인 활성 KRW 가격 존재
 *      (현재 적용 가격 선택은 수납·홈페이지와 같은 findCurrentPrice 규칙)
 * 조건을 만족하지 않으면 PublicInputError → 400, 저장하지 않음
 */
async function verifyCourseAndDuration(programCode: ProgramCode | null, durationWeeks: number | null): Promise<void> {
  if (programCode === null) return;

  const program = await prisma.programs.findUnique({
    where: { code: programCode },
    select: { id: true, is_active: true },
  });
  if (!program || !program.is_active) throw new PublicInputError("선택한 과정을 확인할 수 없습니다.");

  if (durationWeeks === null) return;

  const option = await prisma.program_options.findUnique({
    where: { program_id_duration_weeks: { program_id: program.id, duration_weeks: durationWeeks } },
    select: { id: true, is_active: true, is_public: true },
  });
  if (!option || !option.is_active || !option.is_public) {
    throw new PublicInputError("선택한 과정에서 신청할 수 없는 연수 기간입니다.");
  }

  const current = await findCurrentPrice(prisma, option.id, todayKst());
  if (!current || String(current.currency).trim().toUpperCase() !== "KRW") {
    throw new PublicInputError("선택한 과정에서 신청할 수 없는 연수 기간입니다.");
  }
}

/* ------------------------------------------------------------------ */
/* POST                                                                 */
/* ------------------------------------------------------------------ */

function fail(status: 400 | 500, message: string) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: NextRequest) {
  // 본문 크기 확인 (Content-Length 기준 + 실제 길이)
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return fail(400, MESSAGES.badRequest);

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return fail(400, MESSAGES.badRequest);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fail(400, MESSAGES.badRequest);
    body = parsed as Record<string, unknown>;
  } catch {
    return fail(400, MESSAGES.badRequest);
  }

  let input: CleanInput;
  try {
    input = validateInput(body);
  } catch (error) {
    if (error instanceof PublicInputError) return fail(400, error.message);
    return fail(400, MESSAGES.badRequest);
  }

  try {
    await verifyCourseAndDuration(input.programCode, input.durationWeeks);

    await prisma.consultations.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email,
        message: input.message,
        status: "new",
        source: "homepage",
        age_group: input.ageGroup,
        program_code: input.programCode,
        duration_weeks: input.durationWeeks,
        stay_option: input.stayOption,
        preferred_start_date: input.startDate ? dateOnly(input.startDate) : null,
        english_level: input.englishLevel,
        cebu_month_stay: input.cebuMonthStay,
        local_school_experience: input.localSchool,
        locale: input.locale,
        // student_id / guardian_id / assigned_admin_id: 저장하지 않음 (NULL)
        // counterpart_type: DB 기본값 "student"
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof PublicInputError) return fail(400, error.message);

    // 상세 오류는 서버 로그에만 (클라이언트에는 일반 문구)
    console.error("[public consultations] 상담 신청 저장 오류:", error);
    return fail(500, MESSAGES.serverError);
  }
}
