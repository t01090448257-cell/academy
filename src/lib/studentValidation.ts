// src/lib/studentValidation.ts
// 학생 등록 입력값 정리·검사 (등록 화면과 POST /api/students가 같은 규칙을 사용)
// 길이 제한은 prisma/schema.prisma의 students / guardians 컬럼 길이(VarChar)를 그대로 따릅니다.
// 학생번호(student_no)는 서버가 자동 발급하므로 입력값으로 받지 않습니다. (src/lib/studentNumber.ts)

export interface GuardianInput {
  name?: unknown;
  relationship?: unknown;
  phone?: unknown;
  email?: unknown;
  is_primary?: unknown;
}

export interface StudentInput {
  name?: unknown;
  name_en?: unknown;
  birth_date?: unknown;
  gender?: unknown;
  nationality?: unknown;
  phone?: unknown;
  email?: unknown;
  status?: unknown;
  memo?: unknown;
  guardians?: unknown;
}

export interface CleanGuardian {
  name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
}

export interface CleanStudent {
  name: string;
  name_en: string | null;
  /** YYYY-MM-DD */
  birth_date: string | null;
  gender: string | null;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  memo: string | null;
  guardians: CleanGuardian[];
}

/** 필드별 오류 메시지. 보호자는 "guardians.0.name"처럼 순번을 붙임 */
export type StudentErrors = Record<string, string>;

export const DEFAULT_STUDENT_STATUS = "active"; // students.status 기본값 (schema)

const LIMITS = {
  name: 100,
  name_en: 100,
  gender: 20,
  nationality: 50,
  phone: 30,
  email: 255,
  status: 30,
  guardian_name: 100,
  guardian_relationship: 30,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 앞뒤 공백 제거 + 연속 공백 하나로. 빈 값은 null */
function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned : null;
}

/** 메모처럼 줄바꿈을 유지해야 하는 값: 앞뒤 공백만 제거 */
function multiline(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\r\n/g, "\n").trim();
  return cleaned ? cleaned : null;
}

/** 실제 존재하는 날짜(YYYY-MM-DD)인지, 미래 날짜가 아닌지 확인 */
function checkBirthDate(value: string): string | null {
  const match = DATE_RE.exec(value);
  if (!match) return "생년월일 형식이 올바르지 않습니다. (예: 2012-05-03)";
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return "존재하지 않는 날짜입니다.";
  }
  if (y < 1900) return "생년월일을 다시 확인해 주세요.";
  if (date.getTime() > Date.now()) return "생년월일은 오늘 이후일 수 없습니다.";
  return null;
}

function checkLength(errors: StudentErrors, key: string, value: string | null, max: number, label: string) {
  if (value && value.length > max) errors[key] = `${label}은(는) ${max}자 이내로 입력해 주세요.`;
}

/** 보호자 행이 완전히 비어 있는지 (빈 행은 저장하지 않음) */
function isBlankGuardian(g: GuardianInput): boolean {
  return !text(g.name) && !text(g.relationship) && !text(g.phone) && !text(g.email);
}

export function validateStudentInput(input: StudentInput): { data: CleanStudent; errors: StudentErrors } {
  const errors: StudentErrors = {};

  const data: CleanStudent = {
    name: text(input.name) ?? "",
    name_en: text(input.name_en),
    birth_date: text(input.birth_date),
    gender: text(input.gender),
    nationality: text(input.nationality),
    phone: text(input.phone),
    email: text(input.email),
    status: text(input.status) ?? DEFAULT_STUDENT_STATUS,
    memo: multiline(input.memo),
    guardians: [],
  };

  if (!data.name) errors.name = "이름을 입력해 주세요.";
  checkLength(errors, "name", data.name, LIMITS.name, "이름");
  checkLength(errors, "name_en", data.name_en, LIMITS.name_en, "영문 이름");
  checkLength(errors, "gender", data.gender, LIMITS.gender, "성별");
  checkLength(errors, "nationality", data.nationality, LIMITS.nationality, "국적");
  checkLength(errors, "phone", data.phone, LIMITS.phone, "전화번호");
  checkLength(errors, "status", data.status, LIMITS.status, "상태");

  if (data.email) {
    if (!EMAIL_RE.test(data.email)) errors.email = "이메일 형식이 올바르지 않습니다.";
    else checkLength(errors, "email", data.email, LIMITS.email, "이메일");
  }

  if (data.birth_date) {
    const message = checkBirthDate(data.birth_date);
    if (message) errors.birth_date = message;
  }

  // 보호자 (선택 입력)
  const rawGuardians = Array.isArray(input.guardians) ? (input.guardians as GuardianInput[]) : [];
  rawGuardians.forEach((raw, index) => {
    if (!raw || typeof raw !== "object" || isBlankGuardian(raw)) return;
    const g: CleanGuardian = {
      name: text(raw.name) ?? "",
      relationship: text(raw.relationship),
      phone: text(raw.phone),
      email: text(raw.email),
      is_primary: raw.is_primary === true,
    };
    const key = `guardians.${index}`;
    if (!g.name) errors[`${key}.name`] = "보호자 이름을 입력해 주세요.";
    checkLength(errors, `${key}.name`, g.name, LIMITS.guardian_name, "보호자 이름");
    checkLength(errors, `${key}.relationship`, g.relationship, LIMITS.guardian_relationship, "관계");
    checkLength(errors, `${key}.phone`, g.phone, LIMITS.phone, "전화번호");
    if (g.email) {
      if (!EMAIL_RE.test(g.email)) errors[`${key}.email`] = "이메일 형식이 올바르지 않습니다.";
      else checkLength(errors, `${key}.email`, g.email, LIMITS.email, "이메일");
    }
    data.guardians.push(g);
  });

  if (data.guardians.filter((g) => g.is_primary).length > 1) {
    errors.guardians = "주 보호자는 1명만 선택할 수 있습니다.";
  }

  return { data, errors };
}

/** 전화번호 비교용: 하이픈과 공백만 제거 (빈 값이면 null) */
export function phoneForCompare(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const compact = phone.replace(/[\s-]/g, "");
  return compact ? compact : null;
}
