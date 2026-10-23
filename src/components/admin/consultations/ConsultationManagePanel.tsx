"use client";

// 홈페이지 상담 상세의 「상담 관리」 영역 — [Stage 1]
// - 홈페이지 상담(source = "homepage")에서만 사용 (ConsultationDetail이 표시 여부를 결정)
// - 학생이 연결되지 않은 상태에서도 사용 가능
// - 관리 항목: 상담 상태 / 담당 관리자 / 상담 결과 / 다음 상담일
//   (신청자가 입력한 문의사항 message는 변경하지 않음 — 관리자 기록은 상담 결과(result)에 저장)
// - 담당자 선택지: GET /api/consultations/[id]/manage
// - 저장: PATCH /api/consultations/[id]/manage

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  CONSULTATION_STATUSES,
  CONSULTATION_STATUS_LABELS,
  isConsultationStatus,
} from "@/lib/consultationValidation";
import SessionExpiredNotice from "@/components/admin/SessionExpiredNotice";
import type { ConsultationRecord } from "./ConsultationBadges";

interface AdminOption {
  id: string;
  name: string;
  username: string;
  is_active: boolean;
}

interface FormState {
  status: string;
  assigned_admin_id: string;
  result: string;
  next_consultation_date: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const INPUT =
  "w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100";

function inputClass(error?: string) {
  return `${INPUT} ${error ? "border-red-400 bg-red-50/40" : "border-slate-300"}`;
}

function FieldBox({
  id,
  label,
  hint,
  error,
  className = "",
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
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

/** 상담 기록 → 폼 초기값 */
function toForm(c: ConsultationRecord): FormState {
  return {
    status: isConsultationStatus(c.status) ? c.status : "new",
    assigned_admin_id: c.assigned_admin_id ?? "",
    result: c.result ?? "",
    next_consultation_date: (c.next_consultation_date ?? "").slice(0, 10),
  };
}

export default function ConsultationManagePanel({
  consultation,
  onSaved,
}: {
  consultation: ConsultationRecord;
  /** 저장 성공 후 상담 상세를 다시 불러오기 */
  onSaved: () => void;
}) {
  const c = consultation;
  const [form, setForm] = useState<FormState>(() => toForm(c));
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [adminsError, setAdminsError] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // 담당자 선택지
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/consultations/${encodeURIComponent(c.id)}/manage`, { cache: "no-store" })
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 401) {
          setSessionExpired(true);
          return;
        }
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok || !data?.success) {
          setAdminsError(data?.message || "담당자 목록을 불러오지 못했습니다.");
          return;
        }
        setAdmins(Array.isArray(data.admins) ? (data.admins as AdminOption[]) : []);
      })
      .catch((error) => {
        console.error("담당자 목록 조회 오류:", error);
        if (!cancelled) setAdminsError("담당자 목록을 불러오는 중 오류가 발생했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [c.id]);

  function setField<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    setFormError("");
    setSaved(false);
    setSessionExpired(false);

    savingRef.current = true;
    setSaving(true);
    try {
      const response = await fetch(`/api/consultations/${encodeURIComponent(c.id)}/manage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: form.status,
          // "" = 담당자 미지정
          assigned_admin_id: form.assigned_admin_id || null,
          result: form.result,
          next_consultation_date: form.next_consultation_date || null,
        }),
      });
      if (response.status === 401) {
        setSessionExpired(true);
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        setErrors((data?.errors ?? {}) as Errors);
        setFormError(data?.message || "상담 관리 내용 저장에 실패했습니다.");
        return;
      }
      setErrors({});
      setSaved(true);
      onSaved();
    } catch (error) {
      console.error("상담 관리 저장 오류:", error);
      setFormError("저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  // 담당자: 활성 관리자 + 현재 담당자(비활성이어도 표시)
  const adminChoices = admins.filter((a) => a.is_active || a.id === c.assigned_admin_id);
  // 목록을 아직 못 불러왔더라도 현재 담당자는 선택된 상태로 보이도록
  const currentAdminMissing =
    !!c.assigned_admin_id && !adminChoices.some((a) => a.id === c.assigned_admin_id) && !!c.admin_users;

  return (
    <section className="rounded-2xl bg-white shadow">
      <div className="border-b border-slate-100 px-5 py-3.5 sm:px-6">
        <h2 className="text-base font-semibold text-slate-900">상담 관리</h2>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5 p-5 sm:p-6">
        {sessionExpired && <SessionExpiredNotice />}

        {formError && (
          <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {formError}
          </div>
        )}
        {saved && (
          <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            상담 관리 내용이 저장되었습니다.
          </div>
        )}

        <fieldset disabled={saving} className="grid gap-5 sm:grid-cols-2">
          <FieldBox id="manage_status" label="상담 상태" error={errors.status}>
            <select
              id="manage_status"
              value={form.status}
              onChange={(e) => setField("status", e.target.value)}
              className={`${inputClass(errors.status)} bg-white`}
            >
              {CONSULTATION_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {CONSULTATION_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </FieldBox>

          <FieldBox
            id="manage_assigned_admin_id"
            label="담당 관리자"
            error={errors.assigned_admin_id || adminsError || undefined}
          >
            <select
              id="manage_assigned_admin_id"
              value={form.assigned_admin_id}
              onChange={(e) => setField("assigned_admin_id", e.target.value)}
              className={`${inputClass(errors.assigned_admin_id)} bg-white`}
            >
              <option value="">미지정</option>
              {currentAdminMissing && (
                <option value={c.assigned_admin_id!}>
                  {c.admin_users!.name} ({c.admin_users!.username})
                </option>
              )}
              {adminChoices.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.username}){a.is_active ? "" : " · 비활성"}
                </option>
              ))}
            </select>
          </FieldBox>

          <FieldBox id="manage_next_consultation_date" label="다음 상담일" error={errors.next_consultation_date}>
            <input
              id="manage_next_consultation_date"
              type="date"
              value={form.next_consultation_date}
              onChange={(e) => setField("next_consultation_date", e.target.value)}
              className={inputClass(errors.next_consultation_date)}
            />
          </FieldBox>

          <FieldBox
            id="manage_result"
            label="상담 결과"
            error={errors.result}
            className="sm:col-span-2"
            hint="관리자 상담 기록은 여기에 남깁니다. 홈페이지 신청자가 작성한 문의사항은 변경되지 않습니다."
          >
            <textarea
              id="manage_result"
              rows={5}
              value={form.result}
              onChange={(e) => setField("result", e.target.value)}
              className={inputClass(errors.result)}
              placeholder="상담 진행 내용, 결정 사항, 후속 조치 등"
            />
          </FieldBox>
        </fieldset>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "저장 중..." : "상담 관리 저장"}
          </button>
        </div>
      </form>
    </section>
  );
}
