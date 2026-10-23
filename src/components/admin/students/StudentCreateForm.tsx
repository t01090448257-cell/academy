"use client";

// /admin/students/new 학생 등록 화면
// 저장: 기존 POST /api/students (관리자 로그인 필요)
// 입력 검사는 서버와 같은 규칙(src/lib/studentValidation.ts)으로 먼저 확인하고, 서버 결과도 그대로 표시합니다.
// 학생번호는 서버가 자동 발급하므로 입력받지 않습니다.
// 서버가 "중복 의심"을 알려주면 경고를 보여주고, 관리자가 「그래도 새로 등록」을 누른 경우에만 다시 저장을 요청합니다.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { validateStudentInput, type StudentErrors } from "@/lib/studentValidation";
import { formatDate, show, StatusBadge } from "./format";
import SessionExpiredNotice from "@/components/admin/SessionExpiredNotice";

interface GuardianForm {
  key: number;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  is_primary: boolean;
}

interface StudentForm {
  name: string;
  name_en: string;
  birth_date: string;
  gender: string;
  nationality: string;
  phone: string;
  email: string;
  status: string;
  memo: string;
}

const INPUT =
  "w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100";

function inputClass(error?: string) {
  return `${INPUT} ${error ? "border-red-400 bg-red-50/40" : "border-slate-300"}`;
}

function FieldBox({
  id,
  label,
  required = false,
  hint,
  error,
  className = "",
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}

/** POST /api/students가 돌려주는 중복 의심 학생 (전화번호·이메일은 서버에서 마스킹됨) */
interface DuplicateCandidate {
  id: string;
  student_no: string | null;
  name: string;
  name_en: string | null;
  birth_date: string | null;
  phone_masked: string | null;
  email_masked: string | null;
  status: string;
  reasons: string[];
}

const REASON_LABELS: Record<string, string> = {
  name_birth: "이름 + 생년월일 일치",
  name_en_birth: "영문 이름 + 생년월일 일치",
  phone: "전화번호 일치",
  email: "이메일 일치",
};

function DuplicateWarning({
  duplicates,
  saving,
  onConfirm,
  onDismiss,
}: {
  duplicates: DuplicateCandidate[];
  saving: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow sm:p-6">
      <h2 className="text-base font-semibold text-amber-900">동일한 학생으로 의심되는 학생이 있습니다.</h2>
      <p className="mt-1 text-sm text-amber-800">
        아래 학생과 같은 사람인지 확인해 주세요. 같은 학생이라면 새로 등록하지 말고 기존 학생 정보를 이용해 주세요.
        동명이인 등 다른 학생이라면 「그래도 새로 등록」을 누르면 입력한 내용 그대로 등록됩니다.
      </p>

      <ul className="mt-4 space-y-3">
        {duplicates.map((d) => (
          <li key={d.id} className="rounded-xl bg-white p-4 ring-1 ring-amber-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">
                  {d.name}
                  {d.name_en && <span className="ml-1.5 text-sm font-normal text-slate-500">{d.name_en}</span>}
                </p>
                <p className="mt-0.5 font-mono text-xs text-slate-500">{d.student_no ?? "학생번호 미발급"}</p>
              </div>
              <StatusBadge value={d.status} />
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
              <div><dt className="inline text-slate-400">생년월일 </dt><dd className="inline text-slate-700">{formatDate(d.birth_date)}</dd></div>
              <div><dt className="inline text-slate-400">전화 </dt><dd className="inline text-slate-700">{show(d.phone_masked)}</dd></div>
              <div><dt className="inline text-slate-400">이메일 </dt><dd className="inline break-all text-slate-700">{show(d.email_masked)}</dd></div>
            </dl>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {d.reasons.map((reason) => (
                  <span key={reason} className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    {REASON_LABELS[reason] ?? reason}
                  </span>
                ))}
              </div>
              <Link
                href={`/admin/students/${d.id}`}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                기존 학생 보기
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onDismiss}
          disabled={saving}
          className="rounded-lg border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
        >
          입력 내용 다시 확인
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={saving}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "등록 중..." : "그래도 새로 등록"}
        </button>
      </div>
    </section>
  );
}

function emptyGuardian(key: number, isPrimary = false): GuardianForm {
  return { key, name: "", relationship: "", phone: "", email: "", is_primary: isPrimary };
}

/**
 * [Stage 2] 홈페이지 상담에서 신규 학생 등록 시 초기값 (서버 페이지가 상담을 확인한 뒤 전달)
 * - applicant = "self": 신청자 = 학생 본인 → 학생 이름·전화·이메일 초기값
 * - applicant = "guardian": 신청자 = 보호자 → 첫 번째 보호자(주 보호자) 이름·전화·이메일 초기값, 학생 이름은 직접 입력
 */
export interface ConsultationPrefill {
  consultationId: string;
  applicant: "self" | "guardian";
  name: string;
  phone: string | null;
  email: string | null;
}

/** 상담 신청자로 미리 채운 보호자 입력란의 key (보호자 신청일 때만 사용) */
const APPLICANT_GUARDIAN_KEY = 0;

/** 학생 등록은 성공했지만 상담 연결은 되지 않은 경우 화면에 보여 줄 정보 */
interface LinkFailure {
  studentId: string;
  studentNo: string | null;
  studentName: string;
  message: string;
}

export default function StudentCreateForm({
  statusOptions,
  fromConsultation,
}: {
  statusOptions: string[];
  /** [Stage 2] 홈페이지 상담에서 들어온 경우만 전달 (없으면 기존 학생 등록과 동일) */
  fromConsultation?: ConsultationPrefill;
}) {
  const router = useRouter();
  const prefill = fromConsultation;
  const isSelfApplicant = prefill?.applicant === "self";
  const isGuardianApplicant = prefill?.applicant === "guardian";
  const consultationHref = prefill ? `/admin/consultations/${encodeURIComponent(prefill.consultationId)}` : null;

  const [form, setForm] = useState<StudentForm>({
    // 학생 본인 신청일 때만 신청자 정보를 학생 정보 초기값으로 사용 (보호자 신청이면 학생 이름은 직접 입력)
    name: isSelfApplicant ? prefill!.name : "",
    name_en: "",
    birth_date: "",
    gender: "",
    nationality: "",
    phone: isSelfApplicant ? prefill!.phone ?? "" : "",
    email: isSelfApplicant ? prefill!.email ?? "" : "",
    status: statusOptions[0] ?? "active",
    memo: prefill ? `홈페이지 상담 #${prefill.consultationId}에서 등록` : "",
  });
  // 처음에는 보호자 1명 입력란을 기본 제공 (주 보호자로 체크된 상태)
  // [Stage 2] 보호자 신청이면 그 입력란을 상담 신청자 정보로 채움 (관계는 상담 데이터로 알 수 없으므로 비워 둠)
  const [guardians, setGuardians] = useState<GuardianForm[]>(() => [
    isGuardianApplicant
      ? {
          ...emptyGuardian(APPLICANT_GUARDIAN_KEY, true),
          name: prefill!.name,
          phone: prefill!.phone ?? "",
          email: prefill!.email ?? "",
        }
      : emptyGuardian(APPLICANT_GUARDIAN_KEY, true),
  ]);
  // [Stage 2] 학생은 등록됐지만 상담 연결에 실패한 경우 (같은 학생을 다시 등록하지 않도록 폼 대신 안내 표시)
  const [linkFailure, setLinkFailure] = useState<LinkFailure | null>(null);
  const nextGuardianKey = useRef(1);
  const [errors, setErrors] = useState<StudentErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  // 서버가 돌려준 중복 의심 학생 목록 (있으면 경고 표시)
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  // 저장 중 401: 입력 내용은 그대로 두고 로그인 안내만 표시
  const [sessionExpired, setSessionExpired] = useState(false);

  function setField<K extends keyof StudentForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
    // 입력을 고치면 이전 중복 의심 결과는 더 이상 맞지 않으므로 닫음 (다시 등록하면 서버가 새로 확인)
    if (duplicates.length) setDuplicates([]);
  }

  function setGuardianField(index: number, key: keyof Omit<GuardianForm, "key">, value: string | boolean) {
    setGuardians((prev) =>
      prev.map((g, i) => {
        if (key === "is_primary" && value === true && i !== index) return { ...g, is_primary: false };
        return i === index ? { ...g, [key]: value } : g;
      })
    );
    const errorKey = `guardians.${index}.${key}`;
    if (errors[errorKey] || errors.guardians) {
      setErrors((prev) => ({ ...prev, [errorKey]: "", guardians: "" }));
    }
  }

  function addGuardian() {
    const key = nextGuardianKey.current;
    nextGuardianKey.current += 1;
    setGuardians((prev) => [...prev, emptyGuardian(key, prev.length === 0)]);
  }

  function removeGuardian(index: number) {
    setGuardians((prev) => prev.filter((_, i) => i !== index));
    // 보호자 순번이 바뀌므로 보호자 관련 오류는 다시 검사할 때 새로 표시
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith("guardians"))));
  }

  /**
   * [Stage 2] 등록된 학생을 상담에 연결 (기존 PATCH /api/consultations/[id]/student-link 사용)
   * - 학생 본인 신청: applicant_role = "student"
   * - 보호자 신청: POST /api/students 응답에는 보호자 id가 없으므로, 기존 GET /api/students/[id]로
   *   방금 저장된 보호자 중 「상담 신청자」 입력란과 이름·전화·이메일이 정확히 같은 보호자 1명을 찾아 연결.
   *   정확히 1명이 아니면 추측하지 않고 연결하지 않음.
   */
  async function linkConsultation(
    studentId: string,
    applicantGuardianIndex: number
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    if (!prefill) return { ok: false, message: "상담 정보가 없습니다." };
    const linkFailed = "학생은 등록되었지만 상담 연결에 실패했습니다. 상담 상세 화면에서 기존 학생과 연결해주세요.";
    const guardianUnknown =
      "학생은 등록되었지만 상담 자동 연결에 필요한 보호자 정보가 확인되지 않았습니다. 상담 상세 화면에서 기존 학생과 연결해주세요.";

    try {
      let guardianId: string | null = null;

      if (isGuardianApplicant) {
        const row = guardians[applicantGuardianIndex];
        // 서버 저장과 같은 규칙으로 정리한 값 (공백 정리, 빈 값 → null)
        const expected = row
          ? validateStudentInput({ name: "-", guardians: [{ name: row.name, relationship: row.relationship, phone: row.phone, email: row.email }] })
              .data.guardians[0]
          : undefined;
        if (!expected) return { ok: false, message: guardianUnknown };

        const response = await fetch(`/api/students/${encodeURIComponent(studentId)}`, { cache: "no-store" });
        if (response.status === 401) {
          return { ok: false, message: `${linkFailed} (로그인이 만료되었습니다. 다시 로그인한 뒤 연결해 주세요.)` };
        }
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success) return { ok: false, message: guardianUnknown };

        const links: { guardians: { id: string; name: string; phone: string | null; email: string | null } }[] =
          Array.isArray(data.student?.student_guardians) ? data.student.student_guardians : [];
        const matches = links.filter(
          (link) =>
            link.guardians.name === expected.name &&
            (link.guardians.phone ?? null) === expected.phone &&
            (link.guardians.email ?? null) === expected.email
        );
        if (matches.length !== 1) return { ok: false, message: guardianUnknown };
        guardianId = String(matches[0].guardians.id);
      }

      const response = await fetch(`/api/consultations/${encodeURIComponent(prefill.consultationId)}/student-link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          applicant_role: isGuardianApplicant ? "guardian" : "student",
          guardian_id: guardianId,
        }),
      });
      if (response.status === 401) {
        return { ok: false, message: `${linkFailed} (로그인이 만료되었습니다. 다시 로그인한 뒤 연결해 주세요.)` };
      }
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        return { ok: false, message: data?.message ? `${linkFailed} (사유: ${data.message})` : linkFailed };
      }
      return { ok: true };
    } catch (error) {
      console.error("상담 자동 연결 오류:", error);
      return { ok: false, message: linkFailed };
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(false);
  }

  /** confirmDuplicate=true: 중복 의심 경고를 확인하고 「그래도 새로 등록」을 누른 경우 */
  async function submit(confirmDuplicate: boolean) {
    if (saving) return;
    setFormError("");
    setSessionExpired(false);

    const payload = {
      ...form,
      guardians: guardians.map(({ name, relationship, phone, email, is_primary }) => ({
        name,
        relationship,
        phone,
        email,
        is_primary,
      })),
      ...(confirmDuplicate
        ? { confirmDuplicate: true, acknowledgedDuplicateIds: duplicates.map((d) => d.id) }
        : {}),
    };

    const check = validateStudentInput(payload);
    if (Object.keys(check.errors).length > 0) {
      setErrors(check.errors);
      setFormError("입력 내용을 확인해 주세요.");
      return;
    }

    // [Stage 2] 보호자 신청: 상담 신청자 보호자 입력란이 있어야 등록 후 그 보호자로 상담을 연결할 수 있음
    const applicantGuardianIndex = guardians.findIndex((g) => g.key === APPLICANT_GUARDIAN_KEY);
    if (isGuardianApplicant && (applicantGuardianIndex < 0 || !guardians[applicantGuardianIndex].name.trim())) {
      setErrors((prev) => ({
        ...prev,
        ...(applicantGuardianIndex >= 0 ? { [`guardians.${applicantGuardianIndex}.name`]: "보호자 이름을 입력해 주세요." } : {}),
      }));
      setFormError("보호자 신청으로 등록하려면 「상담 신청자」 보호자 정보(이름)가 필요합니다.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        setSessionExpired(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const data = await response.json().catch(() => null);

      // 중복 의심: 저장되지 않음 → 경고 표시 후 관리자가 선택
      if (data?.duplicateSuspected) {
        setDuplicates(Array.isArray(data.duplicates) ? data.duplicates : []);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (!response.ok || !data?.success) {
        setErrors(data?.errors ?? {});
        setFormError(data?.message || "학생 등록에 실패했습니다.");
        return;
      }

      setDuplicates([]);

      // [Stage 2] 홈페이지 상담에서 들어온 경우: 등록된 학생을 상담에 자동 연결 → 상담 상세로 이동
      if (prefill) {
        const student = data.student as { id: string; student_no: string | null; name: string };
        const linked = await linkConsultation(String(student.id), applicantGuardianIndex);
        if (linked.ok) {
          router.push(`/admin/consultations/${encodeURIComponent(prefill.consultationId)}`);
          router.refresh();
        } else {
          setLinkFailure({
            studentId: String(student.id),
            studentNo: student.student_no ?? null,
            studentName: student.name,
            message: linked.message,
          });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }

      // 상세 화면에서 자동 발급된 학생번호를 크게 보여주도록 created=1 전달
      router.push(`/admin/students/${data.student.id}?created=1`);
      router.refresh();
    } catch (error) {
      console.error("학생 등록 오류:", error);
      setFormError("학생 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  // [Stage 2] 학생은 등록됐지만 상담 연결은 되지 않음 → 같은 학생을 다시 등록하지 않도록 폼 대신 안내
  if (prefill && linkFailure) {
    return (
      <section>
        <Link href={consultationHref!} className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
          <span aria-hidden="true">←</span> 상담 상세
        </Link>
        <div role="alert" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow sm:p-6">
          <h1 className="text-lg font-semibold text-amber-900">상담 연결이 완료되지 않았습니다.</h1>
          <p className="mt-2 text-sm text-amber-800">{linkFailure.message}</p>
          <dl className="mt-4 grid gap-x-6 gap-y-2 rounded-xl bg-white p-4 text-sm ring-1 ring-amber-200 sm:grid-cols-2">
            <div><dt className="inline text-slate-400">등록된 학생 </dt><dd className="inline font-semibold text-slate-900">{linkFailure.studentName}</dd></div>
            <div><dt className="inline text-slate-400">학생번호 </dt><dd className="inline font-mono text-slate-900">{linkFailure.studentNo ?? "미발급"}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-amber-800">
            학생은 이미 등록되었으므로 다시 등록하지 마세요. 상담 상세의 「기존 학생과 연결」에서 이 학생을 검색해 연결할 수 있습니다.
          </p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Link
              href={`/admin/students/${encodeURIComponent(linkFailure.studentId)}`}
              className="rounded-lg border border-amber-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
            >
              등록된 학생 보기
            </Link>
            <Link
              href={consultationHref!}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              상담 상세로 이동해 연결하기
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      {prefill ? (
        <Link href={consultationHref!} className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
          <span aria-hidden="true">←</span> 상담 상세
        </Link>
      ) : (
        <Link href="/admin/students" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
          <span aria-hidden="true">←</span> 학생 목록
        </Link>
      )}
      <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-slate-400">New Student</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">학생 등록</h1>

      {/* [Stage 2] 홈페이지 상담에서 등록 중임을 안내 */}
      {prefill && (
        <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-900">
          <p className="font-semibold">
            홈페이지 상담 #{prefill.consultationId} 신청자 정보로 등록합니다 ·{" "}
            {isGuardianApplicant ? "보호자 신청" : "학생 본인 신청"}
          </p>
          <p className="mt-1 text-sky-800">
            신청자: {prefill.name}
            {prefill.phone ? ` · ${prefill.phone}` : ""}
            {prefill.email ? ` · ${prefill.email}` : ""}
          </p>
          <p className="mt-1 text-xs text-sky-700">
            {isGuardianApplicant
              ? "학생 이름은 직접 입력해 주세요. 신청자는 첫 번째 보호자(상담 신청자)로 입력되어 있습니다."
              : "신청자 정보를 학생 정보에 미리 입력했습니다. 필요하면 수정한 뒤 등록하세요."}{" "}
            등록이 완료되면 이 상담에 자동으로 연결됩니다. 상담의 신청 정보는 변경되지 않습니다.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">
        {sessionExpired && <SessionExpiredNotice />}

        {duplicates.length > 0 && (
          <DuplicateWarning
            duplicates={duplicates}
            saving={saving}
            onConfirm={() => submit(true)}
            onDismiss={() => setDuplicates([])}
          />
        )}

        {formError && (
          <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {formError}
          </div>
        )}

        {/* 기본 정보 */}
        <fieldset disabled={saving} className="rounded-2xl bg-white shadow">
          <legend className="sr-only">기본 정보</legend>
          <div className="border-b border-slate-100 px-5 py-3.5 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">기본 정보</h2>
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
            <FieldBox id="name" label="이름" required error={errors.name}>
              <input id="name" value={form.name} onChange={(e) => setField("name", e.target.value)} className={inputClass(errors.name)} placeholder="예: 김민수" autoComplete="off" />
            </FieldBox>
            <FieldBox id="name_en" label="영문 이름" error={errors.name_en}>
              <input id="name_en" value={form.name_en} onChange={(e) => setField("name_en", e.target.value)} className={inputClass(errors.name_en)} placeholder="예: Minsu Kim" autoComplete="off" />
            </FieldBox>
            <div>
              <p className="mb-1.5 block text-sm font-medium text-slate-700">학생번호</p>
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
                등록 시 자동 발급됩니다.
              </p>
              <p className="mt-1.5 text-xs text-slate-400">예: SYA-2026-0001</p>
            </div>
            <FieldBox id="birth_date" label="생년월일" error={errors.birth_date}>
              <input id="birth_date" type="date" value={form.birth_date} onChange={(e) => setField("birth_date", e.target.value)} className={inputClass(errors.birth_date)} />
            </FieldBox>
            <FieldBox id="gender" label="성별" error={errors.gender}>
              <input id="gender" value={form.gender} onChange={(e) => setField("gender", e.target.value)} className={inputClass(errors.gender)} autoComplete="off" />
            </FieldBox>
            <FieldBox id="nationality" label="국적" error={errors.nationality}>
              <input id="nationality" value={form.nationality} onChange={(e) => setField("nationality", e.target.value)} className={inputClass(errors.nationality)} autoComplete="off" />
            </FieldBox>
            <FieldBox id="phone" label="전화번호" error={errors.phone}>
              <input id="phone" type="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} className={inputClass(errors.phone)} placeholder="예: 010-1234-5678" autoComplete="off" />
            </FieldBox>
            <FieldBox id="email" label="이메일" error={errors.email}>
              <input id="email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className={inputClass(errors.email)} placeholder="example@email.com" autoComplete="off" />
            </FieldBox>
            <FieldBox id="status" label="상태" error={errors.status}>
              <select id="status" value={form.status} onChange={(e) => setField("status", e.target.value)} className={`${inputClass(errors.status)} bg-white`}>
                {statusOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </FieldBox>
            <FieldBox id="memo" label="메모" error={errors.memo} className="sm:col-span-2 lg:col-span-3">
              <textarea id="memo" rows={4} value={form.memo} onChange={(e) => setField("memo", e.target.value)} className={inputClass(errors.memo)} />
            </FieldBox>
          </div>
        </fieldset>

        {/* 보호자 */}
        <fieldset disabled={saving} className="rounded-2xl bg-white shadow">
          <legend className="sr-only">보호자</legend>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">보호자</h2>
              <p className="mt-0.5 text-xs text-slate-400">입력하지 않아도 학생을 등록할 수 있습니다. 빈 칸으로 둔 보호자는 저장되지 않습니다.</p>
            </div>
            <button
              type="button"
              onClick={addGuardian}
              className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              + 보호자 추가
            </button>
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            {errors.guardians && <p className="text-sm font-medium text-red-600">{errors.guardians}</p>}
            {guardians.length === 0 && (
              <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">입력한 보호자가 없습니다.</p>
            )}
            {guardians.map((guardian, index) => {
              const e = (field: string) => errors[`guardians.${index}.${field}`];
              const id = (field: string) => `guardian-${guardian.key}-${field}`;
              return (
                <div key={guardian.key} className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-700">
                      보호자 {index + 1}
                      {/* [Stage 2] 보호자 신청: 상담에 연결될 보호자 */}
                      {isGuardianApplicant && guardian.key === APPLICANT_GUARDIAN_KEY && (
                        <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">상담 신청자</span>
                      )}
                    </p>
                    {/* 보호자 신청이면 상담 신청자 입력란은 삭제하지 않음 (등록 후 이 보호자로 상담을 연결) */}
                    {!(isGuardianApplicant && guardian.key === APPLICANT_GUARDIAN_KEY) && (
                      <button
                        type="button"
                        onClick={() => removeGuardian(index)}
                        className="text-xs font-medium text-slate-500 hover:text-red-600"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <FieldBox id={id("name")} label="이름" error={e("name")}>
                      <input id={id("name")} value={guardian.name} onChange={(ev) => setGuardianField(index, "name", ev.target.value)} className={inputClass(e("name"))} autoComplete="off" />
                    </FieldBox>
                    <FieldBox id={id("relationship")} label="관계" error={e("relationship")}>
                      <input id={id("relationship")} value={guardian.relationship} onChange={(ev) => setGuardianField(index, "relationship", ev.target.value)} className={inputClass(e("relationship"))} placeholder="예: 어머니" autoComplete="off" />
                    </FieldBox>
                    <FieldBox id={id("phone")} label="전화번호" error={e("phone")}>
                      <input id={id("phone")} type="tel" value={guardian.phone} onChange={(ev) => setGuardianField(index, "phone", ev.target.value)} className={inputClass(e("phone"))} autoComplete="off" />
                    </FieldBox>
                    <FieldBox id={id("email")} label="이메일" error={e("email")}>
                      <input id={id("email")} type="email" value={guardian.email} onChange={(ev) => setGuardianField(index, "email", ev.target.value)} className={inputClass(e("email"))} autoComplete="off" />
                    </FieldBox>
                  </div>
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={guardian.is_primary}
                      onChange={(ev) => setGuardianField(index, "is_primary", ev.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    주 보호자
                  </label>
                </div>
              );
            })}
          </div>
        </fieldset>

        {/* 버튼 */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href={consultationHref ?? "/admin/students"}
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "등록 중..." : prefill ? "학생 등록 후 상담 연결" : "학생 등록"}
          </button>
        </div>
      </form>
    </section>
  );
}
