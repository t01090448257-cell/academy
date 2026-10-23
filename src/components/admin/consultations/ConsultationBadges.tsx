// 상담 화면 공용 표시 도우미: 상태·상담 대상 한글 표시, API 응답 타입

import { formatDate, formatDateKst } from "@/components/admin/students/format";
import {
  CONSULTATION_STATUS_LABELS,
  COUNTERPART_LABELS,
  isConsultationStatus,
  isCounterpartType,
} from "@/lib/consultationValidation";

/** GET /api/consultations, /api/consultations/[id] 응답의 상담 한 건 */
export interface ConsultationRecord {
  id: string;
  student_id: string | null;
  counterpart_type: string;
  guardian_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  consulted_at: string | null;
  inquiry_type: string | null;
  message: string | null;
  result: string | null;
  next_consultation_date: string | null;
  status: string;
  assigned_admin_id: string | null;
  created_at: string;
  updated_at: string;
  students: {
    id: string;
    student_no: string | null;
    name: string;
    name_en: string | null;
    birth_date: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  guardians: { id: string; name: string; relationship: string | null; phone: string | null; email: string | null } | null;
  admin_users: { id: string; name: string; username: string } | null;
  // ── 홈페이지 상담 신청 정보 (기존 상담은 대부분 NULL / boolean은 DB 기본값 false) ──
  source?: string | null;
  age_group?: string | null;
  /** programs.code (DB FK) */
  program_code?: string | null;
  duration_weeks?: number | null;
  stay_option?: string | null;
  /** @db.Date → "YYYY-MM-DDT00:00:00.000Z" (formatDate로 날짜 그대로 표시) */
  preferred_start_date?: string | null;
  english_level?: string | null;
  cebu_month_stay?: boolean | null;
  local_school_experience?: boolean | null;
  locale?: string | null;
  /** GET 응답에서만 붙는 값: programs.name (찾지 못하면 null) */
  program_name?: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  new: "bg-sky-50 text-sky-700 ring-sky-200",
  in_progress: "bg-amber-50 text-amber-800 ring-amber-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
};

export function statusLabel(value: string | null | undefined): string {
  if (!value) return "-";
  return isConsultationStatus(value) ? CONSULTATION_STATUS_LABELS[value] : value;
}

export function counterpartLabel(value: string | null | undefined): string {
  if (!value) return "-";
  return isCounterpartType(value) ? COUNTERPART_LABELS[value] : value;
}

/** 상담 상태 배지 (DB 값 → 한글) */
export function ConsultationStatusBadge({ value }: { value: string | null | undefined }) {
  const style = (value && STATUS_STYLES[value]) || "bg-slate-50 text-slate-600 ring-slate-200";
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${style}`}>
      {statusLabel(value)}
    </span>
  );
}

/** 상담 대상 표시: 학생 / 보호자(이름·관계) */
export function CounterpartText({
  record,
}: {
  record: { counterpart_type: string; guardians: { name: string; relationship: string | null } | null };
}) {
  if (record.counterpart_type === "guardian") {
    return (
      <span>
        보호자
        {record.guardians && (
          <span className="text-slate-500">
            {" "}· {record.guardians.name}
            {record.guardians.relationship ? ` (${record.guardians.relationship})` : ""}
          </span>
        )}
      </span>
    );
  }
  return <span>{counterpartLabel(record.counterpart_type)}</span>;
}

/* ------------------------------------------------------------------ */
/* 홈페이지 상담 신청 정보 표시 (관리자 상담 화면 전용, 한국어 고정)          */
/* 홈페이지 dictionary는 가져오지 않고 관리자 표시 문구만 여기 둡니다.        */
/* 표에 없는 값은 원래 값을 그대로 보여 줍니다.                               */
/* ------------------------------------------------------------------ */

type IntakeRecord = Pick<
  ConsultationRecord,
  | "source"
  | "age_group"
  | "program_code"
  | "program_name"
  | "duration_weeks"
  | "stay_option"
  | "preferred_start_date"
  | "english_level"
  | "cebu_month_stay"
  | "local_school_experience"
  | "locale"
>;

const SOURCE_LABELS: Record<string, string> = { homepage: "홈페이지" };
const AGE_GROUP_LABELS: Record<string, string> = {
  adult: "성인 / 대학생",
  teen: "청소년",
  child: "어린이",
  parent: "학부모",
};
const STAY_OPTION_LABELS: Record<string, string> = { included: "숙박 포함", none: "숙박 불필요" };
const ENGLISH_LEVEL_LABELS: Record<string, string> = { beginner: "초급", intermediate: "중급", advanced: "고급" };
const LOCALE_LABELS: Record<string, string> = {
  ko: "한국어",
  en: "영어",
  ja: "일본어",
  vi: "베트남어",
  "zh-TW": "중국어(번체)",
  mn: "몽골어",
  ru: "러시아어",
  ar: "아랍어",
};

/** 값이 있으면 표의 문구(없으면 원래 값), 비어 있으면 "-" */
function labelOf(labels: Record<string, string>, value: string | null | undefined): string {
  if (!value || !value.trim()) return "-";
  return labels[value] ?? value;
}

export function isHomepageConsultation(record: Pick<ConsultationRecord, "source">): boolean {
  return record.source === "homepage";
}

/** 접수 경로: homepage → 홈페이지, 없음 → 관리자 등록, 그 외 → 원래 값 */
export function sourceLabel(value: string | null | undefined): string {
  if (!value || !value.trim()) return "관리자 등록";
  return SOURCE_LABELS[value] ?? value;
}

export function ageGroupLabel(value: string | null | undefined): string {
  return labelOf(AGE_GROUP_LABELS, value);
}

export function stayOptionLabel(value: string | null | undefined): string {
  return labelOf(STAY_OPTION_LABELS, value);
}

export function englishLevelLabel(value: string | null | undefined): string {
  return labelOf(ENGLISH_LEVEL_LABELS, value);
}

export function localeLabel(value: string | null | undefined): string {
  return labelOf(LOCALE_LABELS, value);
}

/** 희망 연수 기간: 4 → "4주" */
export function weeksText(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? `${value}주` : "-";
}

/** 희망 교육과정: DB 프로그램명 → 없으면 프로그램 코드 → 없으면 "-" */
export function programText(record: Pick<IntakeRecord, "program_code" | "program_name">): string {
  if (record.program_name && record.program_name.trim()) return record.program_name;
  return record.program_code && record.program_code.trim() ? record.program_code : "-";
}

/** 희망 과정 시작일 (@db.Date): 기존 formatDate로 날짜 그대로 (시간대 변환 없음) */
export function preferredStartDateText(record: Pick<IntakeRecord, "preferred_start_date">): string {
  return formatDate(record.preferred_start_date);
}

/** 관심 있는 경험: 체크된 항목만, 없으면 "-" */
export function interestsText(record: Pick<IntakeRecord, "cebu_month_stay" | "local_school_experience">): string {
  const items: string[] = [];
  if (record.cebu_month_stay === true) items.push("세부 한달살기");
  if (record.local_school_experience === true) items.push("현지 학교 경험");
  return items.length ? items.join(", ") : "-";
}

/** 상담 신청 정보 영역을 보여 줄지: 홈페이지 상담이거나 신청 정보 값이 하나라도 있으면 */
export function hasIntakeInfo(record: IntakeRecord): boolean {
  if (isHomepageConsultation(record)) return true;
  const filled = (value: string | null | undefined) => !!value && !!value.trim();
  return (
    filled(record.age_group) ||
    filled(record.program_code) ||
    typeof record.duration_weeks === "number" ||
    filled(record.stay_option) ||
    filled(record.preferred_start_date) ||
    filled(record.english_level) ||
    record.cebu_month_stay === true ||
    record.local_school_experience === true ||
    filled(record.locale)
  );
}

/** 상담일 표시: consulted_at(@db.Date) 그대로, 없으면(홈페이지 문의 등) 등록일을 한국 날짜로 */
export function consultedDateText(record: Pick<ConsultationRecord, "consulted_at" | "created_at">): string {
  if (record.consulted_at) return formatDate(record.consulted_at);
  const kst = formatDateKst(record.created_at); // YYYY.MM.DD → 상담일과 같은 YYYY-MM-DD 형식으로
  return kst === "-" ? kst : kst.replace(/\./g, "-");
}
