// src/lib/consultationValidation.ts
// 상담 등록·수정 입력값 정리·검사 (등록/수정 화면과 POST·PUT /api/consultations가 같은 규칙을 사용)
// - 이 파일은 DB를 조회하지 않습니다. 학생·보호자·담당자가 실제로 존재하는지, 보호자가 그 학생과 연결되어 있는지는
//   API(src/app/api/consultations)가 DB에서 다시 확인합니다.
// - 길이 제한은 prisma/schema.prisma의 consultations 컬럼 길이(VarChar)를 따릅니다.

/** 상담 상태: DB CHECK 제약 허용값 그대로 (새 값을 만들지 않음) */
export const CONSULTATION_STATUSES = ["new", "in_progress", "completed", "cancelled"] as const;
export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number];

export const CONSULTATION_STATUS_LABELS: Record<ConsultationStatus, string> = {
  new: "신규",
  in_progress: "상담 진행 중",
  completed: "상담 완료",
  cancelled: "취소",
};

/** consultations.status 기본값 (schema @default("new")) */
export const DEFAULT_CONSULTATION_STATUS: ConsultationStatus = "new";

/** 상담 대상 */
export const COUNTERPART_TYPES = ["student", "guardian"] as const;
export type CounterpartType = (typeof COUNTERPART_TYPES)[number];

export const COUNTERPART_LABELS: Record<CounterpartType, string> = {
  student: "학생",
  guardian: "보호자",
};

/** 관리자 화면에서 고르는 상담 유형 (consultations.inquiry_type에 이 문구 그대로 저장) */
export const CONSULTATION_TYPE_PRESETS = [
  "입학 상담",
  "학업 상담",
  "생활 상담",
  "보호자 상담",
  "수업 상담",
  "기타",
] as const;

const LIMITS = {
  inquiry_type: 50, // VarChar(50)
  message: 10000, // Text (DB 제한 없음 — 화면 입력 상한)
  result: 10000, // Text (DB 제한 없음 — 화면 입력 상한)
} as const;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ID_RE = /^\d{1,18}$/;

export interface ConsultationInput {
  student_id?: unknown;
  counterpart_type?: unknown;
  guardian_id?: unknown;
  consulted_at?: unknown;
  inquiry_type?: unknown;
  message?: unknown;
  result?: unknown;
  next_consultation_date?: unknown;
  status?: unknown;
  assigned_admin_id?: unknown;
}

export interface CleanConsultation {
  /** 숫자 문자열 (BigInt 변환은 API에서) */
  student_id: string;
  counterpart_type: CounterpartType;
  /** counterpart_type이 guardian일 때만 값이 있음 */
  guardian_id: string | null;
  /** YYYY-MM-DD */
  consulted_at: string;
  inquiry_type: string;
  message: string;
  result: string | null;
  /** YYYY-MM-DD */
  next_consultation_date: string | null;
  status: ConsultationStatus;
  /** 담당 관리자 id. null = 미지정, undefined = 요청에 값이 없음(등록 시 로그인 관리자로 지정) */
  assigned_admin_id: string | null | undefined;
}

export type ConsultationErrors = Record<string, string>;

/** 앞뒤 공백 제거 + 연속 공백 하나로. 빈 값은 null */
function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned : null;
}

/** 줄바꿈을 유지해야 하는 긴 글: 앞뒤 공백만 제거 */
function multiline(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\r\n/g, "\n").trim();
  return cleaned ? cleaned : null;
}

/** 숫자 id (문자열 또는 숫자). 빈 값은 null, 형식이 틀리면 "invalid" */
function idValue(value: unknown): string | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  const str = typeof value === "number" && Number.isSafeInteger(value) ? String(value) : value;
  if (typeof str !== "string") return "invalid";
  const trimmed = str.trim();
  if (!trimmed) return null;
  return ID_RE.test(trimmed) && trimmed !== "0" && !/^0\d/.test(trimmed) ? trimmed : "invalid";
}

/** 실제 존재하는 날짜(YYYY-MM-DD)인지 확인 */
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

/** 한국 시간 기준 오늘 (YYYY-MM-DD) — 상담일 기본값 */
export function todayKst(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function isConsultationStatus(value: unknown): value is ConsultationStatus {
  return typeof value === "string" && (CONSULTATION_STATUSES as readonly string[]).includes(value);
}

export function isCounterpartType(value: unknown): value is CounterpartType {
  return typeof value === "string" && (COUNTERPART_TYPES as readonly string[]).includes(value);
}

export function validateConsultationInput(input: ConsultationInput): {
  data: CleanConsultation;
  errors: ConsultationErrors;
} {
  const errors: ConsultationErrors = {};

  const studentId = idValue(input.student_id);
  const guardianId = idValue(input.guardian_id);
  const counterpart = isCounterpartType(input.counterpart_type) ? input.counterpart_type : null;
  const status = isConsultationStatus(input.status) ? input.status : null;
  const assigned =
    input.assigned_admin_id === undefined ? undefined : idValue(input.assigned_admin_id);

  const data: CleanConsultation = {
    student_id: studentId && studentId !== "invalid" ? studentId : "",
    counterpart_type: counterpart ?? "student",
    guardian_id: null,
    consulted_at: text(input.consulted_at) ?? "",
    inquiry_type: text(input.inquiry_type) ?? "",
    message: multiline(input.message) ?? "",
    result: multiline(input.result),
    next_consultation_date: text(input.next_consultation_date),
    status: status ?? DEFAULT_CONSULTATION_STATUS,
    assigned_admin_id: assigned === "invalid" ? null : assigned,
  };

  // 학생 (필수)
  if (studentId === "invalid") errors.student_id = "학생 정보가 올바르지 않습니다. 학생을 다시 선택해 주세요.";
  else if (!studentId) errors.student_id = "학생을 선택해 주세요.";

  // 상담 대상 (필수) + 보호자
  if (!counterpart) {
    errors.counterpart_type = "상담 대상을 선택해 주세요.";
  } else if (counterpart === "guardian") {
    if (guardianId === "invalid") errors.guardian_id = "보호자 정보가 올바르지 않습니다. 보호자를 다시 선택해 주세요.";
    else if (!guardianId) errors.guardian_id = "상담한 보호자를 선택해 주세요.";
    else data.guardian_id = guardianId;
  }
  // 상담 대상이 학생이면 보호자 값은 저장하지 않음 (보내더라도 무시)

  // 상담일 (필수)
  if (!data.consulted_at) {
    errors.consulted_at = "상담일을 입력해 주세요.";
  } else {
    const message = checkDate(data.consulted_at);
    if (message) errors.consulted_at = message;
  }

  // 상담 유형 (필수)
  if (!data.inquiry_type) errors.inquiry_type = "상담 유형을 선택해 주세요.";
  else if (data.inquiry_type.length > LIMITS.inquiry_type) {
    errors.inquiry_type = `상담 유형은 ${LIMITS.inquiry_type}자 이내로 입력해 주세요.`;
  }

  // 상담 내용 (필수)
  if (!data.message) errors.message = "상담 내용을 입력해 주세요.";
  else if (data.message.length > LIMITS.message) {
    errors.message = `상담 내용은 ${LIMITS.message.toLocaleString()}자 이내로 입력해 주세요.`;
  }

  // 상담 결과 (선택)
  if (data.result && data.result.length > LIMITS.result) {
    errors.result = `상담 결과는 ${LIMITS.result.toLocaleString()}자 이내로 입력해 주세요.`;
  }

  // 다음 상담일 (선택) — 상담일보다 앞설 수 없음
  if (data.next_consultation_date) {
    const message = checkDate(data.next_consultation_date);
    if (message) errors.next_consultation_date = message;
    else if (!errors.consulted_at && data.consulted_at && data.next_consultation_date < data.consulted_at) {
      errors.next_consultation_date = "다음 상담일은 상담일 이후여야 합니다.";
    }
  }

  // 상담 상태 (필수, DB 허용값만)
  if (!status) errors.status = "상담 상태를 선택해 주세요.";

  // 담당자 (선택: 비우면 미지정)
  if (assigned === "invalid") errors.assigned_admin_id = "담당자 정보가 올바르지 않습니다.";

  return { data, errors };
}
