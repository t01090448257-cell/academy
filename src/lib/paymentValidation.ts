const ID_RE = /^\d{1,18}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidDateOnly(value: string) {
  if (!DATE_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
const METHODS = ["cash","bank_transfer","card","other"];
const REFUND_METHODS = ["cash","bank_transfer","card_reversal","other"];

function parseWonAmount(value: unknown): number {
  const text = typeof value === "number"
    ? (Number.isSafeInteger(value) ? String(value) : "")
    : typeof value === "string" ? value.trim() : "";
  if (!/^\d{1,10}$/.test(text)) return Number.NaN;
  const amount = Number(text);
  return Number.isSafeInteger(amount) && amount <= 9_999_999_999
    ? amount
    : Number.NaN;
}

export function validatePaymentInput(body: any) {
  body = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const errors: Record<string,string> = {};
  const amount = parseWonAmount(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = "결제 금액은 0보다 커야 합니다.";
  const method = String(body.payment_method ?? "");
  if (!METHODS.includes(method)) errors.payment_method = "결제 방법이 올바르지 않습니다.";
  if (body.payment_date && !isValidDateOnly(String(body.payment_date))) errors.payment_date = "결제일이 올바른 날짜가 아닙니다.";
  return { errors, data: { amount, payment_method: method, payment_date: body.payment_date ? String(body.payment_date) : null, payer_name: body.payer_name ? String(body.payer_name).slice(0,100) : null, transaction_id: body.transaction_id ? String(body.transaction_id).slice(0,200) : null, memo: body.memo ? String(body.memo).slice(0,10000) : null } };
}
export function validateRefundInput(body: any) {
  body = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const errors: Record<string,string> = {};
  const amount = parseWonAmount(body.refund_amount);
  if (!Number.isFinite(amount) || amount <= 0) errors.refund_amount = "환불 금액은 0보다 커야 합니다.";
  if (body.payment_id && !ID_RE.test(String(body.payment_id))) errors.payment_id = "결제 ID가 올바르지 않습니다.";
  if (body.refund_method && !REFUND_METHODS.includes(String(body.refund_method))) errors.refund_method = "환불 방법이 올바르지 않습니다.";
  return { errors, data: { refund_amount: amount, payment_id: body.payment_id ? String(body.payment_id) : null, refund_reason: body.refund_reason ? String(body.refund_reason).slice(0,10000) : null, refund_method: body.refund_method ? String(body.refund_method) : null, memo: body.memo ? String(body.memo).slice(0,10000) : null } };
}
