const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^\d{1,18}$/;

export type EnrollmentInput = {
  student_id?: unknown;
  program_id?: unknown;
  program_option_id?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  enrollment_type?: unknown;
  status?: unknown;
  base_amount?: unknown;
  discount_amount?: unknown;
  memo?: unknown;
  assigned_admin_id?: unknown;
  first_payment?: {
    amount?: unknown;
    payment_date?: unknown;
    payment_method?: unknown;
    payer_name?: unknown;
    transaction_id?: unknown;
    memo?: unknown;
  };
};

export function validateEnrollmentInput(body: EnrollmentInput) {
  body = body && typeof body === "object" && !Array.isArray(body)
    ? body
    : ({} as EnrollmentInput);
  const errors: Record<string,string> = {};
  const student_id = String(body.student_id ?? "");
  if (!ID_RE.test(student_id)) errors.student_id = "학생을 선택해 주세요.";
  const parseWon = (value: unknown, emptyAsZero = false): number => {
    if (value === undefined || value === null || value === "") {
      return emptyAsZero ? 0 : Number.NaN;
    }
    const text = typeof value === "number"
      ? (Number.isSafeInteger(value) ? String(value) : "")
      : typeof value === "string" ? value.trim() : "";
    if (!/^\d{1,10}$/.test(text)) return Number.NaN;
    const amount = Number(text);
    return Number.isSafeInteger(amount) && amount <= 9_999_999_999
      ? amount
      : Number.NaN;
  };
  const base = parseWon(body.base_amount, true);
  const discount = parseWon(body.discount_amount, true);
  if (!Number.isFinite(base) || base < 0) errors.base_amount = "수강료는 0원 이상이어야 합니다.";
  if (!Number.isFinite(discount) || discount < 0) errors.discount_amount = "할인은 0원 이상이어야 합니다.";
  if (discount > base) errors.discount_amount = "할인은 수강료를 초과할 수 없습니다.";
  const start = body.start_date ? String(body.start_date) : "";
  const end = body.end_date ? String(body.end_date) : "";
  if (start && !DATE_RE.test(start)) errors.start_date = "시작일 형식이 올바르지 않습니다.";
  if (end && !DATE_RE.test(end)) errors.end_date = "종료일 형식이 올바르지 않습니다.";
  if (start && end && end < start) errors.end_date = "종료일은 시작일보다 빠를 수 없습니다.";
  const type = String(body.enrollment_type ?? "program_and_accommodation");
  if (!["program_only","accommodation_only","program_and_accommodation"].includes(type)) errors.enrollment_type = "등록 유형이 올바르지 않습니다.";
  const status = String(body.status ?? "inquiry");
  if (!["inquiry","reserved","active","completed","cancelled"].includes(status)) errors.status = "등록 상태가 올바르지 않습니다.";
  return { errors, data: { student_id, program_id: body.program_id ? String(body.program_id) : null, program_option_id: body.program_option_id ? String(body.program_option_id) : null, start_date: start || null, end_date: end || null, enrollment_type: type, status, base_amount: base, discount_amount: discount, memo: body.memo ? String(body.memo).slice(0,10000) : null, assigned_admin_id: body.assigned_admin_id ? String(body.assigned_admin_id) : null, first_payment: body.first_payment } };
}
