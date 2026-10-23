"use client";

// /admin/students/[id]/edit 학생 수정 화면
// 불러오기: GET /api/students/[id] (기본 정보 + 보호자만 사용, 상담·등록·결제 이력은 수정하지 않음)
// 저장:     PUT /api/students/[id] (관리자 로그인 필요, 학생 + 보호자를 하나의 트랜잭션으로 저장)
// 입력 검사는 등록 화면과 같은 규칙(src/lib/studentValidation.ts)을 사용합니다.
// 학생번호는 최초 등록 시 자동 발급된 번호이므로 읽기 전용으로만 표시합니다.
// 서버가 "중복 의심"을 알려주면 경고를 보여주고, 관리자가 「그래도 수정」을 누른 경우에만 다시 저장을 요청합니다.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { validateStudentInput, type StudentErrors } from "@/lib/studentValidation";
import { formatDate, show, StatusBadge } from "./format";
import SessionExpiredNotice from "@/components/admin/SessionExpiredNotice";

interface GuardianForm {
  key: number;
  /** 기존 보호자 id (새로 추가한 보호자는 null) */
  id: string | null;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  is_primary: boolean;
  /** 이 보호자와 연결된 학생 수 (이 학생 포함). 2 이상이면 다른 학생과 함께 쓰는 보호자 */
  linkedStudents: number;
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

/** GET /api/students/[id] 응답 중 수정 화면에서 쓰는 부분 */
interface StudentApiData {
  id: string;
  student_no: string | null;
  name: string;
  name_en: string | null;
  birth_date: string | null;
  gender: string | null;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  memo: string | null;
  student_guardians: {
    is_primary: boolean;
    guardians: {
      id: string;
      name: string;
      relationship: string | null;
      phone: string | null;
      email: string | null;
      _count?: { student_guardians?: number };
    };
  }[];
}

type LoadState =
  | { kind: "loading" }
  | { kind: "sessionExpired" }
  | { kind: "error"; message: string; notFound: boolean }
  | { kind: "ready"; studentNo: string | null; studentName: string };

/** PUT /api/students/[id]가 돌려주는 중복 의심 학생 (전화번호·이메일은 서버에서 마스킹됨) */
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

/* 아래 입력 스타일·FieldBox는 학생 등록 화면(StudentCreateForm)과 같은 디자인입니다. */
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
      <h2 className="text-base font-semibold text-amber-900">비슷한 학생이 이미 등록되어 있습니다.</h2>
      <p className="mt-1 text-sm text-amber-800">
        수정한 내용이 아래 학생과 겹칩니다. 같은 사람인지 확인해 주세요.
        다른 학생이 맞다면 「그래도 수정」을 누르면 입력한 내용 그대로 저장됩니다.
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
              {/* 수정 중인 내용이 사라지지 않도록 새 탭에서 열기 */}
              <a
                href={`/admin/students/${d.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                기존 학생 보기 <span aria-hidden="true">↗</span>
              </a>
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
          {saving ? "저장 중..." : "그래도 수정"}
        </button>
      </div>
    </section>
  );
}

const EMPTY_FORM: StudentForm = {
  name: "",
  name_en: "",
  birth_date: "",
  gender: "",
  nationality: "",
  phone: "",
  email: "",
  status: "",
  memo: "",
};

export default function StudentEditForm({ id, statusOptions }: { id: string; statusOptions: string[] }) {
  const router = useRouter();
  const detailHref = `/admin/students/${encodeURIComponent(id)}`;

  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [form, setForm] = useState<StudentForm>(EMPTY_FORM);
  const [guardians, setGuardians] = useState<GuardianForm[]>([]);
  // 삭제한 기존 보호자 (저장할 때 연결 해제. 저장 전에는 되돌릴 수 있음)
  const [removedGuardians, setRemovedGuardians] = useState<GuardianForm[]>([]);
  const nextGuardianKey = useRef(0);
  const [errors, setErrors] = useState<StudentErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  // 빠른 연속 클릭에도 PUT이 한 번만 나가도록 (state는 다음 렌더링 전까지 바뀌지 않으므로 ref로도 막음)
  const savingRef = useRef(false);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  // 저장 중 401: 입력 내용은 그대로 두고 로그인 안내만 표시
  const [sessionExpired, setSessionExpired] = useState(false);

  // 기존 학생 정보 불러오기
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/students/${encodeURIComponent(id)}`, { cache: "no-store" })
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
            message: data?.message || "학생 정보를 불러오지 못했습니다.",
            notFound: response.status === 404 || response.status === 400,
          });
          return;
        }

        const student = data.student as StudentApiData;
        setForm({
          name: student.name ?? "",
          name_en: student.name_en ?? "",
          birth_date: student.birth_date ? student.birth_date.slice(0, 10) : "",
          gender: student.gender ?? "",
          nationality: student.nationality ?? "",
          phone: student.phone ?? "",
          email: student.email ?? "",
          status: student.status ?? "",
          memo: student.memo ?? "",
        });
        setGuardians(
          (student.student_guardians ?? []).map((link) => {
            const key = nextGuardianKey.current;
            nextGuardianKey.current += 1;
            return {
              key,
              id: link.guardians.id,
              name: link.guardians.name ?? "",
              relationship: link.guardians.relationship ?? "",
              phone: link.guardians.phone ?? "",
              email: link.guardians.email ?? "",
              is_primary: link.is_primary,
              linkedStudents: link.guardians._count?.student_guardians ?? 1,
            };
          })
        );
        setRemovedGuardians([]);
        setLoad({ kind: "ready", studentNo: student.student_no, studentName: student.name });
      })
      .catch((error) => {
        console.error("학생 정보 조회 오류:", error);
        if (!cancelled) {
          setLoad({ kind: "error", message: "학생 정보를 불러오는 중 오류가 발생했습니다.", notFound: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function setField<K extends keyof StudentForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
    // 입력을 고치면 이전 중복 의심 결과는 더 이상 맞지 않으므로 닫음 (다시 저장하면 서버가 새로 확인)
    if (duplicates.length) setDuplicates([]);
  }

  function setGuardianField(
    index: number,
    key: "name" | "relationship" | "phone" | "email" | "is_primary",
    value: string | boolean
  ) {
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
    setGuardians((prev) => [
      ...prev,
      { key, id: null, name: "", relationship: "", phone: "", email: "", is_primary: prev.length === 0, linkedStudents: 1 },
    ]);
  }

  function removeGuardian(index: number) {
    const target = guardians[index];
    setGuardians((prev) => prev.filter((_, i) => i !== index));
    // 기존 보호자는 "삭제 예정" 목록으로 (저장 전까지 되돌리기 가능). 새로 추가한 빈 칸은 그냥 제거
    if (target?.id) setRemovedGuardians((prev) => [...prev, target]);
    // 보호자 순번이 바뀌므로 보호자 관련 오류는 다시 검사할 때 새로 표시
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith("guardians"))));
  }

  function restoreGuardian(key: number) {
    const target = removedGuardians.find((g) => g.key === key);
    if (!target) return;
    setRemovedGuardians((prev) => prev.filter((g) => g.key !== key));
    // 되돌릴 때 다른 보호자가 이미 주 보호자라면 주 보호자 표시는 해제
    setGuardians((prev) => [
      ...prev,
      { ...target, is_primary: target.is_primary && !prev.some((g) => g.is_primary) },
    ]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(false);
  }

  /** confirmDuplicate=true: 중복 의심 경고를 확인하고 「그래도 수정」을 누른 경우 */
  async function submit(confirmDuplicate: boolean) {
    if (savingRef.current) return;
    setFormError("");
    setSessionExpired(false);

    const payload = {
      ...form,
      guardians: guardians.map(({ id: guardianId, name, relationship, phone, email, is_primary }) => ({
        id: guardianId,
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

    savingRef.current = true;
    setSaving(true);
    let succeeded = false;
    try {
      const response = await fetch(`/api/students/${encodeURIComponent(id)}`, {
        method: "PUT",
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
        setFormError(data?.message || "학생 정보 수정에 실패했습니다.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      succeeded = true;
      setDuplicates([]);
      router.push(`${detailHref}?updated=1`);
      router.refresh();
    } catch (error) {
      console.error("학생 수정 오류:", error);
      setFormError("학생 정보 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      // 저장에 성공하면 상세 화면으로 이동할 때까지 버튼을 계속 비활성화
      if (!succeeded) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  }

  const backLink = (
    <Link href={detailHref} className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
      <span aria-hidden="true">←</span> 학생 상세
    </Link>
  );

  if (load.kind === "loading") {
    return (
      <section>
        {backLink}
        <div className="mt-4 space-y-4" aria-label="학생 정보 불러오는 중">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-64 animate-pulse rounded-2xl bg-white shadow" />
          <div className="h-40 animate-pulse rounded-2xl bg-white shadow" />
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
        <Link href="/admin/students" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
          <span aria-hidden="true">←</span> 학생 목록
        </Link>
        <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow sm:p-12">
          <p className="text-lg font-semibold text-slate-900">
            {load.notFound ? "학생을 찾을 수 없습니다." : "학생 정보를 불러오지 못했습니다."}
          </p>
          <p className="mt-2 text-sm text-slate-500">{load.message}</p>
        </div>
      </section>
    );
  }

  // 현재 학생의 상태값이 선택지에 없더라도 그대로 선택할 수 있도록 포함
  const statuses = form.status && !statusOptions.includes(form.status) ? [...statusOptions, form.status] : statusOptions;

  return (
    <section>
      {backLink}
      <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Edit Student</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">학생 수정</h1>
        <p className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-white">
          <span className="text-[11px] font-semibold tracking-wide text-white/60">학생번호</span>
          <span className="font-mono text-base font-bold tracking-wide">{load.studentNo ?? "미발급"}</span>
        </p>
      </div>

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
            <FieldBox id="student_no" label="학생번호" hint="학생번호는 변경할 수 없습니다.">
              <input
                id="student_no"
                value={load.studentNo ?? "미발급"}
                readOnly
                aria-readonly="true"
                tabIndex={-1}
                className="w-full cursor-not-allowed rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 font-mono text-sm font-semibold text-slate-600 outline-none"
              />
            </FieldBox>
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
                {statuses.map((value) => (
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
              <p className="mt-0.5 text-xs text-slate-400">빈 칸으로 둔 보호자는 저장되지 않습니다. 삭제한 보호자는 저장할 때 이 학생과의 연결이 해제됩니다.</p>
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
              <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">연결된 보호자가 없습니다.</p>
            )}
            {guardians.map((guardian, index) => {
              const e = (field: string) => errors[`guardians.${index}.${field}`];
              const fieldId = (field: string) => `guardian-${guardian.key}-${field}`;
              const shared = guardian.id !== null && guardian.linkedStudents > 1;
              return (
                <div key={guardian.key} className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-700">
                      보호자 {index + 1}
                      {guardian.id === null && (
                        <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">새 보호자</span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeGuardian(index)}
                      className="text-xs font-medium text-slate-500 hover:text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                  {shared && (
                    <p className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
                      다른 학생 {guardian.linkedStudents - 1}명과 함께 연결된 보호자입니다. 정보를 수정하면 해당 학생에게도 함께 반영되며,
                      삭제하면 이 학생과의 연결만 해제되고 보호자 정보는 유지됩니다.
                    </p>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <FieldBox id={fieldId("name")} label="이름" error={e("name")}>
                      <input id={fieldId("name")} value={guardian.name} onChange={(ev) => setGuardianField(index, "name", ev.target.value)} className={inputClass(e("name"))} autoComplete="off" />
                    </FieldBox>
                    <FieldBox id={fieldId("relationship")} label="관계" error={e("relationship")}>
                      <input id={fieldId("relationship")} value={guardian.relationship} onChange={(ev) => setGuardianField(index, "relationship", ev.target.value)} className={inputClass(e("relationship"))} placeholder="예: 어머니" autoComplete="off" />
                    </FieldBox>
                    <FieldBox id={fieldId("phone")} label="전화번호" error={e("phone")}>
                      <input id={fieldId("phone")} type="tel" value={guardian.phone} onChange={(ev) => setGuardianField(index, "phone", ev.target.value)} className={inputClass(e("phone"))} autoComplete="off" />
                    </FieldBox>
                    <FieldBox id={fieldId("email")} label="이메일" error={e("email")}>
                      <input id={fieldId("email")} type="email" value={guardian.email} onChange={(ev) => setGuardianField(index, "email", ev.target.value)} className={inputClass(e("email"))} autoComplete="off" />
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

            {removedGuardians.length > 0 && (
              <div className="rounded-xl border border-dashed border-red-200 bg-red-50/50 p-4">
                <p className="text-sm font-semibold text-red-800">저장하면 연결이 해제될 보호자</p>
                <ul className="mt-2 space-y-2">
                  {removedGuardians.map((g) => (
                    <li key={g.key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-slate-700">
                        <span className="font-semibold text-slate-900">{g.name || "(이름 없음)"}</span>
                        {g.relationship && <span className="ml-1.5 text-slate-500">{g.relationship}</span>}
                        {g.linkedStudents > 1 && (
                          <span className="ml-1.5 text-xs text-slate-500">· 다른 학생과 연결되어 있어 보호자 정보는 유지</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => restoreGuardian(g.key)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        되돌리기
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </fieldset>

        {/* 버튼 */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href={detailHref}
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "저장 중..." : "변경사항 저장"}
          </button>
        </div>
      </form>
    </section>
  );
}
