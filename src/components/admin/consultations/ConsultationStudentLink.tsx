"use client";

// 홈페이지 상담 상세의 「학생 · 신청자 연결」 영역 — [Stage 1]
// - 홈페이지 상담(source = "homepage")에서만 사용 (ConsultationDetail이 표시 여부를 결정)
// - 학생 검색: 기존 StudentPicker(GET /api/students?q=) 그대로 재사용
// - 학생 선택 후: GET /api/students/[id]로 학생 정보 + 연결된 보호자(student_guardians) 확인
// - 저장: PATCH /api/consultations/[id]/student-link (연결 관계만 변경, 신청 원본은 변경하지 않음)
// - 연결 상태는 GET /api/consultations/[id] 결과(student_id / counterpart_type / guardians)로 표시 → 새로고침해도 유지
// - [Stage 3] 신청자가 선택한 학생의 보호자 목록에 없으면: 신청자를 보호자로 등록 후 연결
//   (POST /api/consultations/[id]/applicant-guardian — 보호자 정보는 서버가 상담 원본에서 가져옴)
// - [Stage 4-B] changeMode: 연결된 상담에서 같은 학생 선택 UI로 다른 기존 학생·기존 보호자로 연결 변경
//   (PATCH student-link + mode: "change", 새 보호자 생성은 하지 않음). 연결 해제는 ConsultationDetail의 [연결 해제].

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { formatDate, show } from "@/components/admin/students/format";
import SessionExpiredNotice from "@/components/admin/SessionExpiredNotice";
import StudentPicker from "./StudentPicker";
import { ageGroupLabel, type ConsultationRecord } from "./ConsultationBadges";

type ApplicantRole = "student" | "guardian";

interface GuardianOption {
  id: string;
  name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
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

/** GET /api/students/[id] 응답 → 화면용 학생 정보 (ConsultationForm과 같은 변환) */
function toSelectedStudent(raw: {
  id: string;
  student_no: string | null;
  name: string;
  name_en: string | null;
  birth_date: string | null;
  phone: string | null;
  student_guardians?: {
    is_primary: boolean;
    guardians: { id: string; name: string; relationship: string | null; phone: string | null; email: string | null };
  }[];
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
      email: link.guardians.email,
      is_primary: link.is_primary,
    })),
  };
}

/** 전화번호 비교용 숫자만 (빈 값이면 "") */
function digits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/** 보호자 선택지 중 "목록에 신청자가 없음" */
const GUARDIAN_NOT_LISTED = "__not_listed__";

const NOT_REGISTERED_MESSAGE =
  "현재 선택한 학생에게 등록된 보호자가 아닙니다. 아래 정보로 신청자를 이 학생의 보호자로 등록한 뒤 상담에 연결할 수 있습니다.";

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-900">{children}</dd>
    </div>
  );
}

export default function ConsultationStudentLink({
  consultation,
  onLinked,
  changeMode = false,
  onChangeEnd,
}: {
  consultation: ConsultationRecord;
  /** 연결 성공 후 상담 상세를 다시 불러오기 */
  onLinked: () => void;
  /** [Stage 4-B] 연결된 상담에서 「연결 변경」을 누른 상태 (ConsultationDetail이 관리) */
  changeMode?: boolean;
  /** [Stage 4-B] 연결 변경 종료(취소·성공) */
  onChangeEnd?: () => void;
}) {
  const c = consultation;
  const isLinked = !!c.student_id;
  // [Stage 4-B] 연결된 상담은 연결 변경 중일 때만 학생 선택 영역을 엶
  const isChanging = isLinked && changeMode;

  const [open, setOpen] = useState(false);
  const [justChanged, setJustChanged] = useState(false);
  const [student, setStudent] = useState<SelectedStudent | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState("");
  const [role, setRole] = useState<ApplicantRole | "">("");
  const [guardianId, setGuardianId] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [justLinked, setJustLinked] = useState(false);
  // 학생 정보 요청 순서 보장 (빠르게 다른 학생을 고른 경우 마지막 선택만 반영)
  const requestRef = useRef(0);

  function resetSelection() {
    setStudent(null);
    setRole("");
    setGuardianId("");
    setStudentError("");
    setError("");
  }

  async function loadStudent(studentId: string) {
    const requestNo = requestRef.current + 1;
    requestRef.current = requestNo;
    setStudentLoading(true);
    setStudentError("");
    setError("");
    try {
      const response = await fetch(`/api/students/${encodeURIComponent(studentId)}`, { cache: "no-store" });
      if (requestRef.current !== requestNo) return;
      if (response.status === 401) {
        setSessionExpired(true);
        return;
      }
      const data = await response.json().catch(() => null);
      if (requestRef.current !== requestNo) return;
      if (!response.ok || !data?.success) {
        setStudent(null);
        setStudentError(
          response.status === 404 || response.status === 400
            ? "선택한 학생을 찾을 수 없습니다. 학생을 다시 검색해 주세요."
            : data?.message || "학생 정보를 불러오지 못했습니다."
        );
        return;
      }
      setStudent(toSelectedStudent(data.student));
      setRole("");
      setGuardianId("");
    } catch (err) {
      if (requestRef.current !== requestNo) return;
      console.error("학생 정보 조회 오류:", err);
      setStudentError("학생 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      if (requestRef.current === requestNo) setStudentLoading(false);
    }
  }

  const guardianChoices = student?.guardians ?? [];
  const guardianNotRegistered =
    role === "guardian" && student !== null && (guardianChoices.length === 0 || guardianId === GUARDIAN_NOT_LISTED);
  // [Stage 4-B] 연결 변경 중 현재 연결과 같은 학생 + 보호자 + 상담 대상을 고른 경우 (저장하지 않음)
  const sameAsCurrent =
    isChanging &&
    !!student &&
    student.id === c.student_id &&
    ((role === "student" && c.counterpart_type === "student" && !c.guardian_id) ||
      (role === "guardian" && c.counterpart_type === "guardian" && !!guardianId && guardianId === c.guardian_id));
  const canLink =
    !!student &&
    !saving &&
    !sameAsCurrent &&
    (role === "student" || (role === "guardian" && !!guardianId && guardianId !== GUARDIAN_NOT_LISTED));

  /** 학생 선택 영역 닫기 (연결: 접기 / [Stage 4-B] 연결 변경: 변경 종료) */
  function closePicker() {
    if (isChanging) onChangeEnd?.();
    else setOpen(false);
    resetSelection();
  }

  /**
   * [Stage 3] 신청자를 선택한 학생의 보호자로 등록(같은 보호자가 이미 있으면 그 보호자 사용) 후 상담 연결
   * POST /api/consultations/[id]/applicant-guardian — 보호자 정보는 서버가 상담 원본에서 가져옴 (화면 값은 보내지 않음)
   */
  async function handleAddApplicantGuardian() {
    if (!student || savingRef.current) return;

    if (
      !window.confirm(
        `신청자 ${c.name}님을 ${student.name} 학생의 보호자로 등록하고 상담에 연결합니다.\n\n` +
          "홈페이지 신청자의 원본 정보는 변경되지 않습니다.\n\n계속하시겠습니까?"
      )
    ) {
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setError("");
    setSessionExpired(false);
    try {
      const response = await fetch(`/api/consultations/${encodeURIComponent(c.id)}/applicant-guardian`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: student.id }),
      });
      if (response.status === 401) {
        setSessionExpired(true);
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        setError(data?.message || "신청자를 보호자로 등록하지 못했습니다.");
        // 다른 관리자가 먼저 연결한 경우: 최신 연결 상태를 다시 불러옴
        if (response.status === 409) onLinked();
        return;
      }
      setJustLinked(true);
      setOpen(false);
      resetSelection();
      onLinked();
    } catch (err) {
      console.error("신청자 보호자 등록 오류:", err);
      setError("신청자를 보호자로 등록하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function handleLink() {
    if (!student || !canLink || savingRef.current) return;

    const roleText = role === "student" ? "학생 본인" : "보호자";
    const selectedGuardian = role === "guardian" ? guardianChoices.find((g) => g.id === guardianId) : undefined;
    const confirmText = isChanging
      ? // [Stage 4-B] 연결 변경 확인
        "현재 상담 연결을 변경하시겠습니까?\n\n" +
        `현재: ${c.students?.name ?? "-"}(${c.students?.student_no ?? "학생번호 미발급"}) · ` +
        `${c.counterpart_type === "guardian" ? `보호자 ${c.guardians?.name ?? "-"}` : "학생 본인"}\n` +
        `변경: ${student.name}(${student.student_no ?? "학생번호 미발급"}) · ` +
        `${role === "guardian" ? `보호자 ${selectedGuardian?.name ?? "-"}` : "학생 본인"}\n\n` +
        "학생·보호자 정보와 홈페이지 신청 정보는 변경되지 않습니다."
      : `신청자 ${c.name}님을 학생 ${student.name}(${student.student_no ?? "학생번호 미발급"})과 연결합니다.\n` +
        `신청자 역할: ${roleText}\n\n홈페이지 신청 정보는 변경되지 않습니다. 연결하시겠습니까?`;
    if (!window.confirm(confirmText)) {
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setError("");
    setSessionExpired(false);
    try {
      const response = await fetch(`/api/consultations/${encodeURIComponent(c.id)}/student-link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.id,
          applicant_role: role,
          guardian_id: role === "guardian" ? guardianId : null,
          // [Stage 4-B] 연결 변경: 화면에서 본 현재 연결을 함께 보내 다른 관리자의 변경과 충돌을 확인
          ...(isChanging
            ? { mode: "change", expected_student_id: c.student_id, expected_guardian_id: c.guardian_id ?? null }
            : {}),
        }),
      });
      if (response.status === 401) {
        setSessionExpired(true);
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        setError(data?.message || (isChanging ? "상담 연결 변경에 실패했습니다." : "학생 연결에 실패했습니다."));
        // 다른 관리자가 먼저 연결·변경한 경우: 최신 연결 상태를 다시 불러옴
        if (response.status === 409) onLinked();
        return;
      }
      if (isChanging && data.unchanged) {
        // 서버 기준으로도 현재 연결과 같아 저장하지 않음
        setError("현재 연결과 동일합니다.");
        return;
      }
      setJustLinked(true);
      setJustChanged(isChanging);
      if (isChanging) onChangeEnd?.();
      else setOpen(false);
      resetSelection();
      onLinked();
    } catch (err) {
      console.error("학생 연결 오류:", err);
      setError("학생 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const studentHref = c.students ? `/admin/students/${encodeURIComponent(c.students.id)}` : null;

  return (
    <section className="rounded-2xl bg-white shadow">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 sm:px-6">
        <h2 className="text-base font-semibold text-slate-900">학생 · 신청자 연결</h2>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
            isLinked ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"
          }`}
        >
          {isLinked ? "연결 완료" : "학생 미연결"}
        </span>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {sessionExpired && <SessionExpiredNotice />}

        {/* 신청자 원본 정보 (홈페이지 신청 당시 그대로) */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">홈페이지 신청자 (원본)</p>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="신청자 이름">{c.name}</Info>
            <Info label="연락처">{show(c.phone)}</Info>
            <Info label="이메일">{show(c.email)}</Info>
            <Info label="연령/구분">{ageGroupLabel(c.age_group)}</Info>
          </dl>
        </div>

        {justLinked && isLinked && !isChanging && (
          <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {justChanged ? "상담 연결이 변경되었습니다." : "학생이 연결되었습니다."}
          </div>
        )}

        {/* 학생 선택 영역이 닫힌 상태의 오류 (예: 다른 관리자가 먼저 연결 상태를 바꿔 409 후 다시 불러온 경우) */}
        {error && !(isChanging || (!isLinked && open)) && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        {/* 연결 완료 상태 */}
        {isLinked && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="연결된 학생">
                {studentHref ? (
                  <Link href={studentHref} className="font-semibold text-slate-900 underline-offset-2 hover:underline">
                    {c.students!.name}
                    {c.students!.name_en && <span className="ml-1.5 font-normal text-slate-500">{c.students!.name_en}</span>}
                  </Link>
                ) : (
                  <span className="text-slate-500">학생 정보를 불러올 수 없습니다.</span>
                )}
              </Info>
              <Info label="학생번호">
                <span className="font-mono">{c.students ? c.students.student_no ?? "미발급" : "-"}</span>
              </Info>
              <Info label="신청자 역할">{c.counterpart_type === "guardian" ? "보호자" : "학생 본인"}</Info>
              {c.counterpart_type === "guardian" && (
                <Info label="보호자">
                  {c.guardians ? (
                    <>
                      {c.guardians.name}
                      {c.guardians.relationship && <span className="text-slate-500"> ({c.guardians.relationship})</span>}
                    </>
                  ) : (
                    <span className="text-slate-500">보호자 정보가 삭제됨</span>
                  )}
                </Info>
              )}
            </dl>
            <p className="mt-3 text-xs text-slate-500">
              위 신청자 정보는 연결·변경·해제 후에도 변경되지 않습니다.
            </p>
          </div>
        )}

        {/* 미연결: 기존 학생과 연결 */}
        {!isLinked && !open && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                setJustLinked(false);
                setJustChanged(false);
              }}
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              기존 학생과 연결
            </button>
            <p className="text-xs text-slate-500">
              이미 등록된 학생이면 검색해서 연결합니다. 학생 등록 전이라도 아래 「상담 관리」는 사용할 수 있습니다.
            </p>
          </div>
        )}

        {/* 학생 선택 영역: 미연결 상담의 「기존 학생과 연결」 또는 [Stage 4-B] 연결된 상담의 「연결 변경」 */}
        {((!isLinked && open) || isChanging) && (
          <div className="space-y-4 rounded-xl border border-slate-200 p-4 sm:p-5">
            {isChanging && (
              <p className="rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-900">
                <span className="font-semibold">연결 변경</span> — 새로 연결할 기존 학생을 검색해 선택하세요. 기존
                학생·보호자 정보는 변경되지 않습니다.
              </p>
            )}
            {/* 1) 학생 검색·선택 */}
            {!student && !studentLoading && (
              <StudentPicker
                disabled={saving}
                onSelect={(id) => loadStudent(id)}
                onSessionExpired={() => setSessionExpired(true)}
                onCancel={closePicker}
              />
            )}

            {studentLoading && <div className="h-20 animate-pulse rounded-xl bg-slate-100" aria-label="학생 정보 불러오는 중" />}

            {studentError && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{studentError}</p>}

            {/* 2) 선택한 학생 + 신청자 역할 */}
            {student && !studentLoading && (
              <>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="text-lg font-semibold text-slate-900">{student.name}</p>
                      {student.name_en && <p className="text-sm text-slate-500">{student.name_en}</p>}
                      <p className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs font-semibold text-white">
                        {student.student_no ?? "학생번호 미발급"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={resetSelection}
                      disabled={saving}
                      className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      학생 다시 선택
                    </button>
                  </div>
                  <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    <div><dt className="inline text-slate-400">생년월일 </dt><dd className="inline text-slate-700">{formatDate(student.birth_date)}</dd></div>
                    <div><dt className="inline text-slate-400">전화번호 </dt><dd className="inline text-slate-700">{show(student.phone)}</dd></div>
                  </dl>
                </div>

                <div>
                  <p className="mb-1.5 text-sm font-medium text-slate-700">
                    신청자는 누구입니까?<span className="ml-0.5 text-red-500">*</span>
                  </p>
                  <div role="radiogroup" aria-label="신청자 역할" className="flex flex-wrap gap-2">
                    {(["student", "guardian"] as const).map((value) => (
                      <label
                        key={value}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                          role === value
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="applicant_role"
                          value={value}
                          checked={role === value}
                          onChange={() => {
                            setRole(value);
                            setError("");
                            // 보호자가 1명뿐이면 바로 선택
                            setGuardianId(value === "guardian" && guardianChoices.length === 1 ? guardianChoices[0].id : "");
                          }}
                          disabled={saving}
                          className="sr-only"
                        />
                        {value === "student" ? "학생 본인" : "보호자"}
                      </label>
                    ))}
                  </div>
                </div>

                {role === "student" && (
                  <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    신청자 <span className="font-semibold">{c.name}</span>님을 학생{" "}
                    <span className="font-semibold">{student.name}</span> 본인으로 연결합니다.
                  </p>
                )}

                {role === "guardian" && guardianChoices.length > 0 && (
                  <fieldset disabled={saving}>
                    <legend className="mb-1.5 text-sm font-medium text-slate-700">
                      이 학생에게 등록된 보호자 중 신청자를 선택하세요<span className="ml-0.5 text-red-500">*</span>
                    </legend>
                    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                      {guardianChoices.map((g) => {
                        const phoneMatch = !!digits(g.phone) && digits(g.phone) === digits(c.phone);
                        return (
                          <li key={g.id}>
                            <label className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-slate-50">
                              <input
                                type="radio"
                                name="guardian_id"
                                value={g.id}
                                checked={guardianId === g.id}
                                onChange={() => {
                                  setGuardianId(g.id);
                                  setError("");
                                }}
                              />
                              <span className="font-semibold text-slate-900">{g.name}</span>
                              {g.relationship && <span className="text-sm text-slate-500">({g.relationship})</span>}
                              {g.phone && <span className="text-xs text-slate-500">{g.phone}</span>}
                              {g.is_primary && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">주 보호자</span>
                              )}
                              {phoneMatch && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                  신청자 연락처와 일치
                                </span>
                              )}
                            </label>
                          </li>
                        );
                      })}
                      <li>
                        <label className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50">
                          <input
                            type="radio"
                            name="guardian_id"
                            value={GUARDIAN_NOT_LISTED}
                            checked={guardianId === GUARDIAN_NOT_LISTED}
                            onChange={() => {
                              setGuardianId(GUARDIAN_NOT_LISTED);
                              setError("");
                            }}
                          />
                          목록에 신청자(보호자)가 없음
                        </label>
                      </li>
                    </ul>
                  </fieldset>
                )}

                {/* [Stage 4-B] 연결 변경에서는 새 보호자를 만들지 않음 (기존 보호자만 선택) */}
                {guardianNotRegistered && isChanging && (
                  <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    연결 변경은 선택한 학생에게 이미 등록된 보호자로만 할 수 있습니다. 신청자를 새 보호자로 등록하려면
                    「연결 해제」 후 「기존 학생과 연결」에서 진행해 주세요.
                  </p>
                )}

                {/* [Stage 3] 신청자가 이 학생의 보호자 목록에 없음 → 신청자를 보호자로 등록 후 연결 */}
                {guardianNotRegistered && !isChanging && (
                  <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                    <p className="text-sm text-amber-800">{NOT_REGISTERED_MESSAGE}</p>
                    <div className="rounded-lg bg-white p-4 ring-1 ring-amber-200">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">신규 보호자</p>
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                          홈페이지 상담 원본 정보 사용
                        </span>
                      </div>
                      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                        <div><dt className="inline text-slate-400">이름 </dt><dd className="inline text-slate-900">{c.name}</dd></div>
                        <div><dt className="inline text-slate-400">연락처 </dt><dd className="inline text-slate-900">{show(c.phone)}</dd></div>
                        <div><dt className="inline text-slate-400">이메일 </dt><dd className="inline break-all text-slate-900">{show(c.email)}</dd></div>
                        <div><dt className="inline text-slate-400">관계 </dt><dd className="inline text-slate-500">미지정</dd></div>
                        <div className="sm:col-span-2">
                          <dt className="inline text-slate-400">학생 </dt>
                          <dd className="inline text-slate-900">
                            {student.name} ({student.student_no ?? "학생번호 미발급"})
                          </dd>
                        </div>
                      </dl>
                      <p className="mt-3 text-xs text-slate-500">
                        이 학생에게 이름·연락처·이메일이 같은 보호자가 이미 있으면 새로 만들지 않고 그 보호자로 연결합니다.
                        {guardianChoices.length > 0
                          ? " 기존 주 보호자는 바뀌지 않습니다."
                          : " 이 학생의 첫 보호자이므로 주 보호자로 등록됩니다."}
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddApplicantGuardian}
                        disabled={saving}
                        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? "처리 중..." : "신청자를 보호자로 등록 후 연결"}
                      </button>
                    </div>
                  </div>
                )}

                {/* [Stage 4-B] 현재 연결과 같은 대상 → 저장하지 않음 */}
                {sameAsCurrent && (
                  <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">현재 연결과 동일합니다.</p>
                )}

                {error && (
                  <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </p>
                )}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closePicker}
                    disabled={saving}
                    className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleLink}
                    disabled={!canLink}
                    className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? isChanging
                        ? "변경 중..."
                        : "연결 중..."
                      : isChanging
                        ? "이 학생으로 연결 변경"
                        : "이 학생과 연결"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
