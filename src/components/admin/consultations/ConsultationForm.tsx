"use client";

// /admin/consultations/new 상담 등록, /admin/consultations/[id]/edit 상담 수정 (같은 화면)
// - 학생: 기존 학생을 검색해서 선택 (GET /api/students?q=), 선택한 학생 정보·보호자는 GET /api/students/[id]
// - 상담 대상이 보호자면: 선택한 학생에게 연결된 보호자 중에서만 선택
// - 저장: POST /api/consultations (등록) / PUT /api/consultations/[id] (수정)
// - 입력 검사는 서버와 같은 규칙(src/lib/consultationValidation.ts). 학생·보호자 연결은 서버가 DB에서 다시 확인
// - 저장 중 401: 입력 내용은 그대로 두고 로그인 안내(현재 주소를 returnUrl로 전달)

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  CONSULTATION_STATUSES,
  CONSULTATION_STATUS_LABELS,
  COUNTERPART_LABELS,
  COUNTERPART_TYPES,
  DEFAULT_CONSULTATION_STATUS,
  todayKst,
  validateConsultationInput,
  type ConsultationErrors,
} from "@/lib/consultationValidation";
import { formatDate, show } from "@/components/admin/students/format";
import SessionExpiredNotice from "@/components/admin/SessionExpiredNotice";
import StudentPicker from "./StudentPicker";
import type { ConsultationRecord } from "./ConsultationBadges";

export interface AdminOptionItem {
  id: string;
  name: string;
  username: string;
  is_active: boolean;
}

interface GuardianOption {
  id: string;
  name: string;
  relationship: string | null;
  phone: string | null;
  is_primary: boolean;
}

interface SelectedStudent {
  id: string;
  student_no: string | null;
  name: string;
  name_en: string | null;
  birth_date: string | null;
  phone: string | null;
  guardians: GuardianOption[];
}

interface FormState {
  counterpart_type: string;
  guardian_id: string;
  consulted_at: string;
  inquiry_type: string;
  message: string;
  result: string;
  next_consultation_date: string;
  status: string;
  assigned_admin_id: string;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "sessionExpired" }
  | { kind: "error"; message: string; notFound: boolean }
  | { kind: "ready" };

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

/** GET /api/students/[id] 응답 → 선택한 학생 정보 */
function toSelectedStudent(raw: {
  id: string;
  student_no: string | null;
  name: string;
  name_en: string | null;
  birth_date: string | null;
  phone: string | null;
  student_guardians?: { is_primary: boolean; guardians: { id: string; name: string; relationship: string | null; phone: string | null } }[];
}): SelectedStudent {
  return {
    id: raw.id,
    student_no: raw.student_no,
    name: raw.name,
    name_en: raw.name_en,
    birth_date: raw.birth_date,
    phone: raw.phone,
    guardians: (raw.student_guardians ?? []).map((link) => ({
      id: link.guardians.id,
      name: link.guardians.name,
      relationship: link.guardians.relationship,
      phone: link.guardians.phone,
      is_primary: link.is_primary,
    })),
  };
}

export default function ConsultationForm({
  mode,
  consultationId,
  initialStudentId,
  admins,
  currentAdminId,
  typeOptions,
}: {
  mode: "create" | "edit";
  consultationId?: string;
  initialStudentId?: string;
  admins: AdminOptionItem[];
  currentAdminId: string | null;
  typeOptions: string[];
}) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const detailHref = consultationId ? `/admin/consultations/${encodeURIComponent(consultationId)}` : "/admin/consultations";
  const cancelHref = isEdit
    ? detailHref
    : initialStudentId
      ? `/admin/students/${encodeURIComponent(initialStudentId)}`
      : "/admin/consultations";

  const defaultAdmin = currentAdminId && admins.some((a) => a.id === currentAdminId && a.is_active) ? currentAdminId : "";

  const [load, setLoad] = useState<LoadState>(isEdit ? { kind: "loading" } : { kind: "ready" });
  const [form, setForm] = useState<FormState>({
    counterpart_type: "student",
    guardian_id: "",
    consulted_at: todayKst(),
    inquiry_type: "",
    message: "",
    result: "",
    next_consultation_date: "",
    status: DEFAULT_CONSULTATION_STATUS,
    assigned_admin_id: defaultAdmin,
  });
  const [student, setStudent] = useState<SelectedStudent | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState("");
  // 학생 검색창 표시 여부 (등록: 학생 미선택 시, 수정: 「학생 변경」을 누른 경우)
  const [picking, setPicking] = useState(!isEdit && !initialStudentId);
  // 수정 화면에서 원래 연결된 학생 (변경 취소용)
  const [originalStudent, setOriginalStudent] = useState<SelectedStudent | null>(null);
  // 수정 화면: 원래 담당자 (비활성 관리자여도 선택지에 표시)
  const [originalAdminId, setOriginalAdminId] = useState<string | null>(null);

  const [errors, setErrors] = useState<ConsultationErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  // 빠른 연속 클릭에도 저장 요청이 한 번만 나가도록 (state는 다음 렌더링 전까지 바뀌지 않으므로 ref로도 막음)
  const savingRef = useRef(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  // 학생 정보 요청 순서 보장 (빠르게 다른 학생을 고른 경우 마지막 선택만 반영)
  const studentRequestRef = useRef(0);

  async function loadStudent(studentId: string, options: { keepGuardian?: string; asOriginal?: boolean } = {}) {
    const requestNo = studentRequestRef.current + 1;
    studentRequestRef.current = requestNo;
    setStudentLoading(true);
    setStudentError("");
    try {
      const response = await fetch(`/api/students/${encodeURIComponent(studentId)}`, { cache: "no-store" });
      if (studentRequestRef.current !== requestNo) return;
      if (response.status === 401) {
        setSessionExpired(true);
        return;
      }
      const data = await response.json().catch(() => null);
      if (studentRequestRef.current !== requestNo) return;
      if (!response.ok || !data?.success) {
        setStudentError(
          response.status === 404 || response.status === 400
            ? "선택한 학생을 찾을 수 없습니다. 학생을 다시 검색해 주세요."
            : data?.message || "학생 정보를 불러오지 못했습니다."
        );
        setStudent(null);
        setPicking(true);
        return;
      }
      const selected = toSelectedStudent(data.student);
      setStudent(selected);
      if (options.asOriginal) setOriginalStudent(selected);
      setPicking(false);
      // 학생이 바뀌면 이전 학생의 보호자 선택은 무효 → 새 학생의 보호자 중에서 다시 선택
      setForm((prev) => {
        const keep = options.keepGuardian ?? prev.guardian_id;
        return { ...prev, guardian_id: selected.guardians.some((g) => g.id === keep) ? keep : "" };
      });
      setErrors((prev) => ({ ...prev, student_id: "", guardian_id: "" }));
    } catch (error) {
      if (studentRequestRef.current !== requestNo) return;
      console.error("학생 정보 조회 오류:", error);
      setStudentError("학생 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      if (studentRequestRef.current === requestNo) setStudentLoading(false);
    }
  }

  // 등록: 학생 상세에서 「상담 등록」으로 들어온 경우 학생 미리 선택
  // 수정: 기존 상담 기록 불러오기
  useEffect(() => {
    let cancelled = false;

    if (!isEdit) {
      if (initialStudentId) loadStudent(initialStudentId);
      return () => {
        cancelled = true;
      };
    }

    fetch(`/api/consultations/${encodeURIComponent(consultationId ?? "")}`, { cache: "no-store" })
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 401) {
          setLoad({ kind: "sessionExpired" });
          return;
        }
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok || !data?.success) {
          setLoad({
            kind: "error",
            message: data?.message || "상담 기록을 불러오지 못했습니다.",
            notFound: response.status === 404 || response.status === 400,
          });
          return;
        }
        const record = data.consultation as ConsultationRecord;
        setForm({
          counterpart_type: record.counterpart_type === "guardian" ? "guardian" : "student",
          guardian_id: record.guardian_id ?? "",
          consulted_at: (record.consulted_at ?? "").slice(0, 10) || todayKst(),
          inquiry_type: record.inquiry_type ?? "",
          message: record.message ?? "",
          result: record.result ?? "",
          next_consultation_date: (record.next_consultation_date ?? "").slice(0, 10),
          status: record.status,
          assigned_admin_id: record.assigned_admin_id ?? "",
        });
        setOriginalAdminId(record.assigned_admin_id);
        setLoad({ kind: "ready" });
        if (record.student_id) {
          loadStudent(record.student_id, { keepGuardian: record.guardian_id ?? "", asOriginal: true });
        } else {
          // 학생이 연결되지 않은 기록(예: 홈페이지 문의)은 학생을 선택해야 저장 가능
          setPicking(true);
        }
      })
      .catch((error) => {
        console.error("상담 기록 조회 오류:", error);
        if (!cancelled) setLoad({ kind: "error", message: "상담 기록을 불러오는 중 오류가 발생했습니다.", notFound: false });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, consultationId, initialStudentId]);

  function setField<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function selectCounterpart(value: string) {
    setForm((prev) => ({
      ...prev,
      counterpart_type: value,
      // 보호자가 1명뿐이면 바로 선택
      guardian_id:
        value === "guardian" && !prev.guardian_id && student?.guardians.length === 1 ? student.guardians[0].id : prev.guardian_id,
    }));
    setErrors((prev) => ({ ...prev, counterpart_type: "", guardian_id: "" }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    setFormError("");
    setSessionExpired(false);

    const payload = {
      student_id: student?.id ?? "",
      counterpart_type: form.counterpart_type,
      guardian_id: form.counterpart_type === "guardian" ? form.guardian_id : null,
      consulted_at: form.consulted_at,
      inquiry_type: form.inquiry_type,
      message: form.message,
      result: form.result,
      next_consultation_date: form.next_consultation_date,
      status: form.status,
      // "" = 담당자 미지정
      assigned_admin_id: form.assigned_admin_id,
    };

    const check = validateConsultationInput(payload);
    if (picking && student === null && !check.errors.student_id) {
      check.errors.student_id = "학생을 선택해 주세요.";
    }
    if (Object.keys(check.errors).length > 0) {
      setErrors(check.errors);
      setFormError("입력 내용을 확인해 주세요.");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    let succeeded = false;
    try {
      const response = await fetch(isEdit ? `/api/consultations/${encodeURIComponent(consultationId ?? "")}` : "/api/consultations", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        setSessionExpired(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        setErrors(data?.errors ?? {});
        setFormError(data?.message || (isEdit ? "상담 기록 수정에 실패했습니다." : "상담 등록에 실패했습니다."));
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      succeeded = true;
      router.push(`/admin/consultations/${data.consultation.id}?${isEdit ? "updated" : "created"}=1`);
      router.refresh();
    } catch (error) {
      console.error(isEdit ? "상담 수정 오류:" : "상담 등록 오류:", error);
      setFormError("저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      // 저장에 성공하면 상세 화면으로 이동할 때까지 버튼을 계속 비활성화
      if (!succeeded) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  }

  const backLink = (
    <Link href={cancelHref} className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
      <span aria-hidden="true">←</span> {isEdit ? "상담 상세" : initialStudentId ? "학생 상세" : "상담 목록"}
    </Link>
  );

  if (load.kind === "loading") {
    return (
      <section>
        {backLink}
        <div className="mt-4 space-y-4" aria-label="상담 기록 불러오는 중">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-40 animate-pulse rounded-2xl bg-white shadow" />
          <div className="h-64 animate-pulse rounded-2xl bg-white shadow" />
        </div>
      </section>
    );
  }

  if (load.kind === "sessionExpired") {
    return (
      <section>
        {backLink}
        <div className="mt-6">
          <SessionExpiredNotice />
        </div>
      </section>
    );
  }

  if (load.kind === "error") {
    return (
      <section>
        <Link href="/admin/consultations" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
          <span aria-hidden="true">←</span> 상담 목록
        </Link>
        <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow sm:p-12">
          <p className="text-lg font-semibold text-slate-900">
            {load.notFound ? "상담 기록을 찾을 수 없습니다." : "상담 기록을 불러오지 못했습니다."}
          </p>
          <p className="mt-2 text-sm text-slate-500">{load.message}</p>
        </div>
      </section>
    );
  }

  // 선택지: 유형은 현재 값이 목록에 없더라도 포함, 담당자는 활성 관리자 + 현재 담당자(비활성이어도)
  const types = form.inquiry_type && !typeOptions.includes(form.inquiry_type) ? [...typeOptions, form.inquiry_type] : typeOptions;
  const adminChoices = admins.filter((a) => a.is_active || a.id === originalAdminId);
  const guardianChoices = student?.guardians ?? [];

  return (
    <section>
      {backLink}
      <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
        {isEdit ? "Edit Consultation" : "New Consultation"}
      </p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{isEdit ? "상담 수정" : "상담 등록"}</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">
        {sessionExpired && <SessionExpiredNotice />}

        {formError && (
          <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {formError}
          </div>
        )}

        {/* 학생 */}
        <fieldset disabled={saving} className="rounded-2xl bg-white shadow">
          <legend className="sr-only">학생</legend>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">
              학생<span className="ml-0.5 text-red-500">*</span>
            </h2>
            {student && !picking && (
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                학생 변경
              </button>
            )}
          </div>
          <div className="space-y-4 p-5 sm:p-6">
            {studentLoading && <div className="h-20 animate-pulse rounded-xl bg-slate-100" aria-label="학생 정보 불러오는 중" />}

            {!studentLoading && student && !picking && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-lg font-semibold text-slate-900">{student.name}</p>
                  {student.name_en && <p className="text-sm text-slate-500">{student.name_en}</p>}
                  <p className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs font-semibold text-white">
                    {student.student_no ?? "학생번호 미발급"}
                  </p>
                </div>
                <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  <div><dt className="inline text-slate-400">생년월일 </dt><dd className="inline text-slate-700">{formatDate(student.birth_date)}</dd></div>
                  <div><dt className="inline text-slate-400">전화번호 </dt><dd className="inline text-slate-700">{show(student.phone)}</dd></div>
                </dl>
                {isEdit && originalStudent && originalStudent.id !== student.id && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    연결 학생을 {originalStudent.name}({originalStudent.student_no ?? "학생번호 미발급"})에서 변경합니다. 저장해야 반영됩니다.
                  </p>
                )}
              </div>
            )}

            {studentError && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{studentError}</p>}

            {picking && (
              <StudentPicker
                disabled={saving}
                error={errors.student_id}
                onSelect={(id) => loadStudent(id)}
                onSessionExpired={() => setSessionExpired(true)}
                onCancel={student ? () => setPicking(false) : undefined}
              />
            )}
            {!picking && errors.student_id && <p className="text-xs font-medium text-red-600">{errors.student_id}</p>}
          </div>
        </fieldset>

        {/* 상담 정보 */}
        <fieldset disabled={saving} className="rounded-2xl bg-white shadow">
          <legend className="sr-only">상담 정보</legend>
          <div className="border-b border-slate-100 px-5 py-3.5 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">상담 정보</h2>
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div className="sm:col-span-2">
              <p className="mb-1.5 block text-sm font-medium text-slate-700">
                상담 대상<span className="ml-0.5 text-red-500">*</span>
              </p>
              <div role="radiogroup" aria-label="상담 대상" className="flex flex-wrap gap-2">
                {COUNTERPART_TYPES.map((value) => (
                  <label
                    key={value}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                      form.counterpart_type === value
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="counterpart_type"
                      value={value}
                      checked={form.counterpart_type === value}
                      onChange={() => selectCounterpart(value)}
                      className="sr-only"
                    />
                    {COUNTERPART_LABELS[value]}
                  </label>
                ))}
              </div>
              {errors.counterpart_type && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.counterpart_type}</p>}
            </div>

            {form.counterpart_type === "guardian" && (
              <FieldBox
                id="guardian_id"
                label="보호자"
                required
                error={errors.guardian_id}
                className="sm:col-span-2"
                hint={student ? "선택한 학생에게 연결된 보호자만 선택할 수 있습니다." : "먼저 학생을 선택해 주세요."}
              >
                {student && guardianChoices.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
                    이 학생에게 연결된 보호자가 없습니다. 학생 정보에서 보호자를 먼저 등록해 주세요.
                  </p>
                ) : (
                  <select
                    id="guardian_id"
                    value={form.guardian_id}
                    onChange={(e) => setField("guardian_id", e.target.value)}
                    disabled={!student}
                    className={`${inputClass(errors.guardian_id)} bg-white`}
                  >
                    <option value="">보호자를 선택하세요</option>
                    {guardianChoices.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                        {g.relationship ? ` (${g.relationship})` : ""}
                        {g.phone ? ` · ${g.phone}` : ""}
                        {g.is_primary ? " · 주 보호자" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </FieldBox>
            )}

            <FieldBox id="consulted_at" label="상담일" required error={errors.consulted_at}>
              <input id="consulted_at" type="date" value={form.consulted_at} onChange={(e) => setField("consulted_at", e.target.value)} className={inputClass(errors.consulted_at)} />
            </FieldBox>
            <FieldBox id="inquiry_type" label="상담 유형" required error={errors.inquiry_type}>
              <select id="inquiry_type" value={form.inquiry_type} onChange={(e) => setField("inquiry_type", e.target.value)} className={`${inputClass(errors.inquiry_type)} bg-white`}>
                <option value="">상담 유형을 선택하세요</option>
                {types.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </FieldBox>
            <FieldBox id="status" label="상담 상태" required error={errors.status}>
              <select id="status" value={form.status} onChange={(e) => setField("status", e.target.value)} className={`${inputClass(errors.status)} bg-white`}>
                {CONSULTATION_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {CONSULTATION_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </FieldBox>
            <FieldBox id="assigned_admin_id" label="담당자" error={errors.assigned_admin_id} hint={isEdit ? undefined : "기본값은 현재 로그인한 관리자입니다."}>
              <select id="assigned_admin_id" value={form.assigned_admin_id} onChange={(e) => setField("assigned_admin_id", e.target.value)} className={`${inputClass(errors.assigned_admin_id)} bg-white`}>
                <option value="">미지정</option>
                {adminChoices.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.username}){a.is_active ? "" : " · 비활성"}
                  </option>
                ))}
              </select>
            </FieldBox>
            <FieldBox id="next_consultation_date" label="다음 상담일" error={errors.next_consultation_date}>
              <input id="next_consultation_date" type="date" value={form.next_consultation_date} onChange={(e) => setField("next_consultation_date", e.target.value)} className={inputClass(errors.next_consultation_date)} />
            </FieldBox>
            <FieldBox id="message" label="상담 내용" required error={errors.message} className="sm:col-span-2">
              <textarea id="message" rows={8} value={form.message} onChange={(e) => setField("message", e.target.value)} className={inputClass(errors.message)} placeholder="상담한 내용을 입력해 주세요." />
            </FieldBox>
            <FieldBox id="result" label="상담 결과" error={errors.result} className="sm:col-span-2">
              <textarea id="result" rows={5} value={form.result} onChange={(e) => setField("result", e.target.value)} className={inputClass(errors.result)} placeholder="결정 사항, 후속 조치 등 (선택)" />
            </FieldBox>
          </div>
        </fieldset>

        {/* 버튼 */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href={cancelHref}
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "저장 중..." : isEdit ? "변경사항 저장" : "상담 등록"}
          </button>
        </div>
      </form>
    </section>
  );
}
