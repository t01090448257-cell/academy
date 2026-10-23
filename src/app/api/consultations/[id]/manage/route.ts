// src/app/api/consultations/[id]/manage/route.ts
// ─────────────────────────────────────────────────────────────────────
// 홈페이지 상담 "상담 관리" (관리자 로그인 필요) — [Stage 1]
//
// GET   /api/consultations/[id]/manage — 상담 관리 화면의 담당자 선택지
//       (기존 상담 등록·수정 화면과 같은 getConsultationFormOptions() 사용. 비밀번호 등은 조회하지 않음)
//
// PATCH /api/consultations/[id]/manage — 상담 진행 관리 값만 변경
//   본문(보낸 항목만 변경, 보내지 않은 항목은 그대로):
//     status                  : new | in_progress | completed | cancelled (기존 상담 API와 같은 허용값)
//     assigned_admin_id       : 관리자 id | null(""도 null) — 지정 시 존재 + 활성 관리자 (기존 담당자 유지는 비활성이어도 허용)
//     result                  : 상담 결과 메모 | null(빈 문자열 → null), 10,000자 이내
//     next_consultation_date  : YYYY-MM-DD | null(빈 문자열 → null)
//
//   - 홈페이지 상담(source = "homepage")만 허용. 학생이 연결되지 않아도 사용할 수 있습니다.
//   - student_id / guardian_id / counterpart_type, 홈페이지 신청 원본(name, phone, email, message, source, age_group,
//     program_code, duration_weeks, stay_option, preferred_start_date, english_level, cebu_month_stay,
//     local_school_experience, locale, created_at)은 update에 넣지 않습니다.
//   - 관리자가 추가로 기록하는 내용은 result에 저장합니다. (신청자 문의 원문 message는 변경하지 않음)
//   - 하나의 트랜잭션: 확인 → 저장 → admin_logs(UPDATE) 기록
// ─────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serialize";
import { getAdminSessionFromRequest, adminUnauthorizedResponse } from "@/lib/adminApiAuth";
import type { Prisma } from "@/generated/prisma/client";
import { isConsultationStatus, type ConsultationStatus } from "@/lib/consultationValidation";
import { ConsultationRequestError, dateOnly, parseRecordId } from "@/lib/consultationRecords";
import { getConsultationFormOptions } from "@/lib/consultationOptions";
import { clientIp } from "@/lib/programPrices";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** 홈페이지 상담 신청으로 접수된 상담의 source 값 (POST /api/public/consultations가 저장) */
const HOMEPAGE_SOURCE = "homepage";

/** 상담 결과 길이 상한 (기존 상담 입력 검사 src/lib/consultationValidation.ts 와 같은 값) */
const RESULT_MAX = 10000;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function fail(status: number, message: string, field?: string) {
  return NextResponse.json(
    field ? { success: false, message, errors: { [field]: message } } : { success: false, message },
    { status }
  );
}

/** 실제 존재하는 날짜(YYYY-MM-DD)인지 — 기존 상담 입력 검사와 같은 규칙 (2000~2100년) */
function checkDate(value: string): string | null {
  const match = DATE_RE.exec(value);
  if (!match) return "날짜 형식이 올바르지 않습니다. (예: 2026-10-02)";
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return "존재하지 않는 날짜입니다.";
  }
  if (y < 2000 || y > 2100) return "날짜를 다시 확인해 주세요.";
  return null;
}

/** 변경 요청 (undefined = 보내지 않음 → 변경하지 않음) */
interface ManageInput {
  status?: ConsultationStatus;
  assigned_admin_id?: bigint | null;
  result?: string | null;
  next_consultation_date?: string | null;
}

/** 요청 본문 검사. 오류면 [field, message] */
function parseManageInput(body: Record<string, unknown>): { data: ManageInput } | { error: [string, string] } {
  const data: ManageInput = {};

  const status = body.status;
  if (status !== undefined) {
    if (!isConsultationStatus(status)) return { error: ["status", "상담 상태를 선택해 주세요."] };
    data.status = status;
  }

  const raw = body.assigned_admin_id;
  if (raw !== undefined) {
    if (raw === null || raw === "") {
      data.assigned_admin_id = null;
    } else {
      const text = typeof raw === "number" && Number.isSafeInteger(raw) ? String(raw) : typeof raw === "string" ? raw.trim() : "";
      if (!/^[1-9]\d{0,17}$/.test(text)) return { error: ["assigned_admin_id", "담당자 정보가 올바르지 않습니다."] };
      data.assigned_admin_id = BigInt(text);
    }
  }

  const result = body.result;
  if (result !== undefined) {
    if (result !== null && typeof result !== "string") {
      return { error: ["result", "상담 결과 값이 올바르지 않습니다."] };
    }
    // 기존 상담 입력과 같은 정리: 줄바꿈 유지, 앞뒤 공백 제거, 빈 값은 null
    const cleaned = typeof result === "string" ? result.replace(/\r\n/g, "\n").trim() : "";
    if (cleaned.length > RESULT_MAX) {
      return { error: ["result", `상담 결과는 ${RESULT_MAX.toLocaleString()}자 이내로 입력해 주세요.`] };
    }
    data.result = cleaned ? cleaned : null;
  }

  const nextDate = body.next_consultation_date;
  if (nextDate !== undefined) {
    if (nextDate !== null && typeof nextDate !== "string") {
      return { error: ["next_consultation_date", "다음 상담일 값이 올바르지 않습니다."] };
    }
    const text = typeof nextDate === "string" ? nextDate.trim() : "";
    if (text) {
      const message = checkDate(text);
      if (message) return { error: ["next_consultation_date", message] };
      data.next_consultation_date = text;
    } else {
      data.next_consultation_date = null;
    }
  }

  return { data };
}

// GET — 담당자 선택지 (활성/비활성 포함, 화면에서 활성 관리자 + 현재 담당자만 표시)
export async function GET(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  try {
    const { admins } = await getConsultationFormOptions();
    return NextResponse.json({ success: true, admins });
  } catch (error) {
    console.error("상담 관리 선택지 조회 오류:", error);
    return fail(500, "담당자 목록을 불러오지 못했습니다.");
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return adminUnauthorizedResponse();
  }

  const { id } = await params;
  const consultationId = parseRecordId(id);
  if (consultationId === null) return fail(400, "올바르지 않은 상담 ID입니다.");

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid body");
    body = parsed as Record<string, unknown>;
  } catch {
    return fail(400, "요청 형식이 올바르지 않습니다.");
  }

  const parsed = parseManageInput(body);
  if ("error" in parsed) return fail(400, parsed.error[1], parsed.error[0]);
  const input = parsed.data;

  if (Object.keys(input).length === 0) return fail(400, "변경할 항목이 없습니다.");

  const adminId = /^\d{1,18}$/.test(session.id) ? BigInt(session.id) : null;
  const ip = clientIp(request);

  try {
    const saved = await prisma.$transaction(async (tx) => {
      const current = await tx.consultations.findUnique({
        where: { id: consultationId },
        select: {
          id: true,
          source: true,
          status: true,
          assigned_admin_id: true,
          result: true,
          next_consultation_date: true,
        },
      });
      if (!current) throw new ConsultationRequestError(404, "상담 기록을 찾을 수 없습니다.");

      // 홈페이지 상담만 (관리자 등록 상담은 기존 상담 수정 화면 사용)
      if (current.source !== HOMEPAGE_SOURCE) {
        throw new ConsultationRequestError(400, "홈페이지에서 접수된 상담만 이 기능으로 관리할 수 있습니다.");
      }

      // 담당자: 존재 + 활성 (기존 담당자를 그대로 두는 경우는 비활성이어도 허용 — resolveConsultationRefs와 같은 규칙)
      if (input.assigned_admin_id !== undefined && input.assigned_admin_id !== null) {
        const admin = await tx.admin_users.findUnique({
          where: { id: input.assigned_admin_id },
          select: { id: true, is_active: true },
        });
        if (!admin) {
          throw new ConsultationRequestError(400, "선택한 담당자를 찾을 수 없습니다.", "assigned_admin_id");
        }
        if (!admin.is_active && input.assigned_admin_id !== current.assigned_admin_id) {
          throw new ConsultationRequestError(400, "비활성화된 관리자는 담당자로 지정할 수 없습니다.", "assigned_admin_id");
        }
      }

      // 상담 관리 값만 저장 (연결·원본 컬럼은 넣지 않음)
      const data: Prisma.consultationsUncheckedUpdateInput = { updated_at: new Date() };
      if (input.status !== undefined) data.status = input.status;
      if (input.assigned_admin_id !== undefined) data.assigned_admin_id = input.assigned_admin_id;
      if (input.result !== undefined) data.result = input.result;
      if (input.next_consultation_date !== undefined) {
        // @db.Date 컬럼: 기존 상담 API와 같은 dateOnly()로 시간대 영향 없이 저장
        data.next_consultation_date = input.next_consultation_date ? dateOnly(input.next_consultation_date) : null;
      }

      const updated = await tx.consultations.update({
        where: { id: consultationId },
        data,
        select: {
          id: true,
          status: true,
          assigned_admin_id: true,
          result: true,
          next_consultation_date: true,
        },
      });

      // 변경 기록 (기존 admin_logs 구조 그대로 — 다른 API와 같은 action 명칭 UPDATE 사용)
      await tx.admin_logs.create({
        data: {
          admin_user_id: adminId,
          action: "UPDATE",
          table_name: "consultations",
          record_id: current.id,
          old_data: serializeBigInt({
            status: current.status,
            assigned_admin_id: current.assigned_admin_id,
            result: current.result,
            next_consultation_date: current.next_consultation_date,
          }) as unknown as Prisma.InputJsonValue,
          new_data: serializeBigInt({
            status: updated.status,
            assigned_admin_id: updated.assigned_admin_id,
            result: updated.result,
            next_consultation_date: updated.next_consultation_date,
          }) as unknown as Prisma.InputJsonValue,
          ip_address: ip,
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: "상담 관리 내용이 저장되었습니다.",
      consultation: serializeBigInt(saved),
    });
  } catch (error) {
    if (error instanceof ConsultationRequestError) {
      return fail(error.status, error.message, error.field);
    }

    console.error("상담 관리 저장 오류:", error);

    return fail(500, "상담 관리 내용 저장에 실패했습니다.");
  }
}
