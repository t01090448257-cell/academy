// 관리자 학생 화면 공용 표시 형식 도우미

/** DB date 컬럼(@db.Date)을 YYYY-MM-DD로 표시 (시간대 변환 없이 날짜 그대로) */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return value.slice(0, 10);
}

/** timestamptz 컬럼을 한국 시간 기준 YYYY.MM.DD HH:mm 로 표시 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}.${get("month")}.${get("day")} ${get("hour")}:${get("minute")}`;
}

/** 등록일처럼 날짜만 필요한 timestamptz 값 (한국 시간 기준) */
export function formatDateKst(value: string | null | undefined): string {
  const text = formatDateTime(value);
  return text === "-" ? text : text.slice(0, 10);
}

/** Decimal(문자열) 금액을 천 단위 구분으로 표시 (통화 기호는 DB에 없으므로 붙이지 않음) */
export function formatAmount(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

/** 빈 값은 "-" */
export function show(value: string | null | undefined): string {
  return value && value.trim() ? value : "-";
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-slate-100 text-slate-600 ring-slate-200",
};

/** 상태값 배지 (DB 값을 그대로 표시, 알려진 값만 색 구분) */
export function StatusBadge({ value }: { value: string | null | undefined }) {
  const text = value || "-";
  const style = (value && STATUS_STYLES[value]) || "bg-slate-50 text-slate-600 ring-slate-200";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${style}`}>
      {text}
    </span>
  );
}
