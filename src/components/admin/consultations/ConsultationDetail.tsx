"use client";

// /admin/consultations/[id] 상담 상세
// 데이터 흐름: PostgreSQL → Prisma → GET /api/consultations/[id] → 이 화면
// 삭제: 확인창 → DELETE /api/consultations/[id] (서버에서 SUPER_ADMIN만 허용, admin_logs 기록)

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatDate, formatDateTime, show } from "@/components/admin/students/format";
import SessionExpiredNotice from "@/components/admin/SessionExpiredNotice";
import {
  ConsultationStatusBadge,
  CounterpartText,
  ageGroupLabel,
  consultedDateText,
  counterpartLabel,
  englishLevelLabel,
  hasIntakeInfo,
  interestsText,
  isHomepageConsultation,
  localeLabel,
  preferredStartDateText,
  programText,
  sourceLabel,
  stayOptionLabel,
  weeksText,
  type ConsultationRecord,
} from "./ConsultationBadges";
import ConsultationStudentLink from "./ConsultationStudentLink";
import ConsultationManagePanel from "./ConsultationManagePanel";

type LoadState =
  | { kind: "loading" }
  | { kind: "sessionExpired" }
  | { kind: "error"; message: string; notFound: boolean }
  | { kind: "ready"; consultation: ConsultationRecord };

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white shadow">
      <div className="border-b border-slate-100 px-5 py-3.5 sm:px-6">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-3" : undefined}>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-900">{children}</dd>
    </div>
  );
}

function LongText({ value }: { value: string | null }) {
  return value ? <p className="whitespace-pre-line leading-relaxed">{value}</p> : <span className="text-slate-400">-</span>;
}

/**
 * [Stage 4-A] 홈페이지 상담의 학생·보호자 연결 해제
 * DELETE /api/consultations/[id]/student-link — 상담의 연결 값(student_id / guardian_id / counterpart_type)만 해제.
 * 학생·보호자·학생-보호자 관계와 홈페이지 신청 원본은 변경하지 않습니다.
 */
function UnlinkStudentPanel({
  consultationId,
  onUnlinked,
  changing,
  onChangeStart,
}: {
  consultationId: string;
  onUnlinked: () => void;
  /** [Stage 4-B] 연결 변경 진행 중 (위 「학생 · 신청자 연결」 영역에서 학생 선택) */
  changing: boolean;
  /** [Stage 4-B] 「연결 변경」 시작 */
  onChangeStart: () => void;
}) {
  const [unlinking, setUnlinking] = useState(false);
  const unlinkingRef = useRef(false);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);

  async function handleUnlink() {
    if (unlinkingRef.current) return;
    if (
      !window.confirm(
        "상담과 학생/보호자의 연결을 해제하시겠습니까?\n\n" +
          "학생과 보호자 정보 자체는 삭제되지 않습니다.\n" +
          "홈페이지 상담 원본 정보도 변경되지 않습니다."
      )
    ) {
      return;
    }

    unlinkingRef.current = true;
    setUnlinking(true);
    setError("");
    setSessionExpired(false);
    try {
      const response = await fetch(`/api/consultations/${encodeURIComponent(consultationId)}/student-link`, {
        method: "DELETE",
      });
      if (response.status === 401) {
        setSessionExpired(true);
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        setError(data?.message || "연결 해제에 실패했습니다.");
        // 다른 관리자가 먼저 연결 상태를 바꾼 경우: 최신 상태를 다시 불러옴
        if (response.status === 409) onUnlinked();
        return;
      }
      onUnlinked();
    } catch (err) {
      console.error("상담 연결 해제 오류:", err);
      setError("연결 해제 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      unlinkingRef.current = false;
      setUnlinking(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white shadow">
      <div className="space-y-3 p-5 sm:p-6">
        {sessionExpired && <SessionExpiredNotice />}
        {error && (
          <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {changing
              ? "연결 변경 중입니다. 위에서 새로 연결할 학생을 선택하세요."
              : "연결을 잘못한 경우 다른 기존 학생·보호자로 변경하거나 해제할 수 있습니다. 학생·보호자 정보와 홈페이지 신청 원본은 그대로 유지됩니다."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {/* [Stage 4-B] 연결 변경 */}
            {!changing && (
              <button
                type="button"
                onClick={onChangeStart}
                disabled={unlinking}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                연결 변경
              </button>
            )}
            <button
              type="button"
              onClick={handleUnlink}
              disabled={unlinking}
              className="inline-flex items-center rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {unlinking ? "연결 해제 중..." : "연결 해제"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

type NewStudentApplicant = "self" | "guardian";

/** age_group 기준 기본 선택 (확정이 아니라 기본값 — 관리자가 바꿀 수 있음) */
function defaultApplicant(ageGroup: string | null): NewStudentApplicant {
  return ageGroup === "parent" || ageGroup === "child" ? "guardian" : "self";
}

/**
 * [Stage 2] 홈페이지 상담 → 신규 학생 등록
 * 신청자 역할을 고른 뒤 기존 학생 등록 화면(/admin/students/new)으로 이동합니다.
 * 등록·자동 연결은 학생 등록 화면이 기존 POST /api/students → PATCH /api/consultations/[id]/student-link로 처리합니다.
 */
function NewStudentFromConsultation({ consultationId, ageGroup }: { consultationId: string; ageGroup: string | null }) {
  const [applicant, setApplicant] = useState<NewStudentApplicant>(() => defaultApplicant(ageGroup));
  const href = `/admin/students/new?fromConsultation=${encodeURIComponent(consultationId)}&applicant=${applicant}`;

  return (
    <section className="rounded-2xl bg-white shadow">
      <div className="border-b border-slate-100 px-5 py-3.5 sm:px-6">
        <h2 className="text-base font-semibold text-slate-900">신규 학생으로 등록</h2>
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        <p className="text-sm text-slate-600">
          등록된 학생이 없다면 신청자 정보로 새 학생을 등록하고, 등록이 끝나면 이 상담에 자동으로 연결합니다.
        </p>
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">신규 학생 등록 방식</p>
          <div role="radiogroup" aria-label="신규 학생 등록 방식" className="flex flex-wrap gap-2">
            {(["self", "guardian"] as const).map((value) => (
              <label
                key={value}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                  applicant === value
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="new_student_applicant"
                  value={value}
                  checked={applicant === value}
                  onChange={() => setApplicant(value)}
                  className="sr-only"
                />
                {value === "self" ? "학생 본인 신청" : "보호자 신청"}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            {applicant === "self"
              ? "신청자 이름·연락처·이메일을 학생 정보에 미리 입력합니다."
              : "학생 이름은 직접 입력하고, 신청자는 학생의 보호자로 등록합니다."}{" "}
            기본 선택은 연령/구분 기준이며 바꿀 수 있습니다.
          </p>
        </div>
        <div className="flex justify-end">
          <Link
            href={href}
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            신규 학생으로 등록
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function ConsultationDetail({
  id,
  canDelete,
  justCreated = false,
  justUpdated = false,
}: {
  id: string;
  canDelete: boolean;
  justCreated?: boolean;
  justUpdated?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSessionExpired, setDeleteSessionExpired] = useState(false);
  // [Stage 1] 학생 연결·상담 관리 저장 후 상담 기록 다시 불러오기 (화면은 그대로 두고 데이터만 갱신)
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((key) => key + 1);
  // [Stage 4-B] 연결된 홈페이지 상담의 「연결 변경」 진행 여부
  const [changingLink, setChangingLink] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/consultations/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 401) {
          setState({ kind: "sessionExpired" });
          return;
        }
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok || !data?.success) {
          setState({
            kind: "error",
            message: data?.message || "상담 기록을 불러오지 못했습니다.",
            notFound: response.status === 404 || response.status === 400,
          });
          return;
        }
        setState({ kind: "ready", consultation: data.consultation as ConsultationRecord });
      })
      .catch((error) => {
        console.error("상담 상세 조회 오류:", error);
        if (!cancelled) setState({ kind: "error", message: "상담 기록을 불러오는 중 오류가 발생했습니다.", notFound: false });
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  async function handleDelete() {
    if (deletingRef.current) return;
    if (!window.confirm("상담 기록을 삭제하시겠습니까?\n삭제한 상담 기록은 되돌릴 수 없습니다.")) return;

    deletingRef.current = true;
    setDeleting(true);
    setDeleteError("");
    setDeleteSessionExpired(false);
    let succeeded = false;
    try {
      const response = await fetch(`/api/consultations/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (response.status === 401) {
        setDeleteSessionExpired(true);
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        setDeleteError(data?.message || "상담 기록 삭제에 실패했습니다.");
        return;
      }
      succeeded = true;
      router.push("/admin/consultations?deleted=1");
      router.refresh();
    } catch (error) {
      console.error("상담 삭제 오류:", error);
      setDeleteError("상담 기록 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      if (!succeeded) {
        deletingRef.current = false;
        setDeleting(false);
      }
    }
  }

  const backLink = (
    <Link href="/admin/consultations" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
      <span aria-hidden="true">←</span> 상담 목록
    </Link>
  );

  if (state.kind === "loading") {
    return (
      <section>
        {backLink}
        <div className="mt-4 space-y-4" aria-label="상담 기록 불러오는 중">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-40 animate-pulse rounded-2xl bg-white shadow" />
          <div className="h-56 animate-pulse rounded-2xl bg-white shadow" />
        </div>
      </section>
    );
  }

  if (state.kind === "sessionExpired") {
    return (
      <section>
        {backLink}
        <div className="mt-6">
          <SessionExpiredNotice />
        </div>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section>
        {backLink}
        <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow sm:p-12">
          <p className="text-lg font-semibold text-slate-900">
            {state.notFound ? "상담 기록을 찾을 수 없습니다." : "상담 기록을 불러오지 못했습니다."}
          </p>
          <p className="mt-2 text-sm text-slate-500">{state.message}</p>
        </div>
      </section>
    );
  }

  const c = state.consultation;
  const studentHref = c.students ? `/admin/students/${encodeURIComponent(c.students.id)}` : null;
  // 홈페이지에서 접수된 상담 (source = "homepage")
  const isHomepage = isHomepageConsultation(c);

  return (
    <section>
      {backLink}

      {(justCreated || justUpdated) && (
        <div role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-sm font-semibold text-emerald-800">
            {justCreated ? "상담이 등록되었습니다." : "상담 기록이 수정되었습니다."}
          </p>
        </div>
      )}

      {deleteSessionExpired && (
        <div className="mt-4">
          <SessionExpiredNotice />
        </div>
      )}
      {deleteError && (
        <div role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {deleteError}
        </div>
      )}

      {/* 상단 요약 */}
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Consultation</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            {studentHref ? (
              <Link href={studentHref} className="hover:underline">
                {c.students!.name}
              </Link>
            ) : (
              c.name
            )}
            <span className="ml-2 text-lg font-medium text-slate-500">상담</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* [Stage 0] 홈페이지 상담은 신청 원본 보호를 위해 일반 상담 수정 화면으로 들어가지 않음
              (상담 관리 기능은 이후 단계에서 별도 UI로 제공 예정) */}
          {!isHomepage && (
            <Link
              href={`/admin/consultations/${encodeURIComponent(c.id)}/edit`}
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              수정
            </Link>
          )}
          {/* [Stage 5-A] 홈페이지 상담은 삭제 버튼 대신 안내 (관리자 등록 상담은 기존 삭제 버튼 그대로) */}
          {canDelete && isHomepage && (
            <p className="max-w-xs text-xs text-slate-500">
              홈페이지 상담은 원본 신청 기록 보호를 위해 삭제할 수 없습니다.
            </p>
          )}
          {canDelete && !isHomepage && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "삭제 중..." : "삭제"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <Card title="상담 요약">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="학생 이름">
              {studentHref ? (
                <Link href={studentHref} className="font-semibold text-slate-900 underline-offset-2 hover:underline">
                  {c.students!.name}
                  {c.students!.name_en && <span className="ml-1.5 font-normal text-slate-500">{c.students!.name_en}</span>}
                </Link>
              ) : (
                <span className="text-slate-500">학생이 연결되지 않은 기록입니다. (신청자: {c.name})</span>
              )}
            </Field>
            <Field label="학생번호">
              {studentHref ? (
                <Link href={studentHref} className="font-mono underline-offset-2 hover:underline">
                  {c.students!.student_no ?? "미발급"}
                </Link>
              ) : (
                "-"
              )}
            </Field>
            <Field label="상담 대상"><CounterpartText record={c} /></Field>
            {c.counterpart_type === "guardian" && (
              <Field label="보호자 이름">
                {c.guardians ? (
                  <>
                    {c.guardians.name}
                    {c.guardians.relationship && <span className="text-slate-500"> ({c.guardians.relationship})</span>}
                    {c.guardians.phone && <span className="block text-xs text-slate-500">{c.guardians.phone}</span>}
                  </>
                ) : (
                  <span className="text-slate-500">{c.name} (보호자 정보가 삭제됨)</span>
                )}
              </Field>
            )}
            <Field label="상담일">{consultedDateText(c)}</Field>
            <Field label="담당자">{show(c.admin_users?.name)}</Field>
            <Field label="상태"><ConsultationStatusBadge value={c.status} /></Field>
          </dl>
        </Card>

        {/* 홈페이지 상담 신청 정보: 홈페이지 상담이거나 신청 정보 값이 있는 기록에만 표시 */}
        {hasIntakeInfo(c) && (
          <Card title="상담 신청 정보">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="접수 경로">{sourceLabel(c.source)}</Field>
              <Field label="연령/구분">{ageGroupLabel(c.age_group)}</Field>
              <Field label="희망 교육과정">{programText(c)}</Field>
              <Field label="희망 연수 기간">{weeksText(c.duration_weeks)}</Field>
              <Field label="숙박">{stayOptionLabel(c.stay_option)}</Field>
              <Field label="희망 과정 시작일">{preferredStartDateText(c)}</Field>
              <Field label="영어 수준">{englishLevelLabel(c.english_level)}</Field>
              <Field label="관심 있는 경험">{interestsText(c)}</Field>
              <Field label="접수 언어">{localeLabel(c.locale)}</Field>
            </dl>
          </Card>
        )}

        {/* [Stage 1] 홈페이지 상담 관리: 학생 · 신청자 연결 → 상담 관리 (관리자 등록 상담에는 표시하지 않음) */}
        {isHomepage && (
          <>
            <ConsultationStudentLink
              consultation={c}
              onLinked={reload}
              changeMode={changingLink && !!c.student_id}
              onChangeEnd={() => setChangingLink(false)}
            />
            {/* [Stage 4-A] 학생이 연결된 홈페이지 상담에서만: 연결 해제 / [Stage 4-B] 연결 변경 */}
            {c.student_id && (
              <UnlinkStudentPanel
                consultationId={c.id}
                onUnlinked={() => {
                  setChangingLink(false);
                  reload();
                }}
                changing={changingLink}
                onChangeStart={() => setChangingLink(true)}
              />
            )}
            {/* [Stage 2] 학생이 아직 연결되지 않은 홈페이지 상담에서만: 신규 학생 등록 후 자동 연결 */}
            {!c.student_id && <NewStudentFromConsultation consultationId={c.id} ageGroup={c.age_group ?? null} />}
            <ConsultationManagePanel consultation={c} onSaved={reload} />
          </>
        )}

        <Card title="상담 내용">
          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="상담 유형">{show(c.inquiry_type)}</Field>
            <Field label="다음 상담일">{formatDate(c.next_consultation_date)}</Field>
            <Field label="상담 대상 연락처">
              {counterpartLabel(c.counterpart_type)} · {show(c.phone)}
              {c.email && <span className="block text-xs text-slate-500">{c.email}</span>}
            </Field>
            <Field label="상담 내용" wide><LongText value={c.message} /></Field>
            <Field label="상담 결과" wide><LongText value={c.result} /></Field>
            <Field label="등록일">{formatDateTime(c.created_at)}</Field>
            <Field label="수정일">{formatDateTime(c.updated_at)}</Field>
          </dl>
        </Card>
      </div>
    </section>
  );
}
