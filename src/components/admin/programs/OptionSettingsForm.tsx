"use client";

// 기간 「표시 설정」 입력: 홈페이지 표시 / 표시 순서 / 사용 여부 (ProgramPriceManager 안에서 사용)
// 저장: PUT /api/programs/options/[id] — 주수·가격은 바꾸지 않습니다. 최종 판단(최대 4개, 가격 필요)은 서버가 합니다.

import { useRef, useState, type FormEvent } from "react";
import {
  NO_PRICE_PUBLIC_MESSAGE,
  publicLimitMessage,
  validateOptionSettings,
  type OptionErrors,
} from "@/lib/programOptionValidation";
import { MAX_DISPLAY_ORDER, MIN_DISPLAY_ORDER } from "@/config/programPricing";
import type { OptionRow, SaveResult } from "./types";

export default function OptionSettingsForm({
  option,
  label,
  otherPublicCount,
  maxPublic,
  hasUsablePrice,
  legacy,
  onCancel,
  onDone,
}: {
  option: OptionRow;
  label: string;
  /** 이 기간을 제외하고 홈페이지 표시 중인(활성) 기간 수 */
  otherPublicCount: number;
  maxPublic: number;
  /** 적용 중이거나 적용 예정인 활성 가격이 있는지 */
  hasUsablePrice: boolean;
  /** 이전 REGULAR/CAMP 프로그램 (홈페이지 표시 불가) */
  legacy: boolean;
  onCancel: () => void;
  onDone: (result: SaveResult) => void;
}) {
  const [form, setForm] = useState({
    is_public: option.is_public,
    display_order: option.display_order !== null ? String(option.display_order) : "",
    is_active: option.is_active,
  });
  const [errors, setErrors] = useState<OptionErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) setErrors((prev) => ({ ...prev, [key]: "" }));
    if (formError) setFormError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;

    const { errors: found } = validateOptionSettings(form);
    if (form.is_public && !option.is_public && !hasUsablePrice) found.is_public = NO_PRICE_PUBLIC_MESSAGE;
    if (form.is_public && form.is_active && otherPublicCount >= maxPublic) found.is_public = publicLimitMessage();
    if (Object.values(found).some(Boolean)) {
      setErrors(found);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setFormError("");
    let finished = false;
    try {
      const response = await fetch(`/api/programs/options/${encodeURIComponent(option.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, display_order: form.display_order.trim() }),
      });
      if (response.status === 401) {
        onDone({ kind: "sessionExpired" });
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        setErrors(data?.errors ?? {});
        setFormError(data?.message || "설정을 저장하지 못했습니다.");
        return;
      }
      finished = true;
      onDone({ kind: "saved", message: data.message || "저장되었습니다." });
    } catch (error) {
      console.error("기간 설정 저장 오류:", error);
      setFormError("설정 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      if (!finished) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  }

  const idp = `option-settings-${option.id}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-sm font-semibold text-slate-900">{label} · 표시 설정</p>
      <p className="mt-1 text-xs text-slate-500">
        주수는 수납 기록과 연결되어 있어 바꿀 수 없습니다. 필요 없는 기간은 「사용」을 해제해 주세요. (가격 이력과 기존 수납 기록은 그대로 남습니다)
      </p>

      {formError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</p>}

      <fieldset disabled={saving} className="mt-3 grid gap-3 sm:grid-cols-3 sm:items-start">
        <div>
          <p className="mb-1 block text-xs font-medium text-slate-600">홈페이지 표시</p>
          <label className={`inline-flex h-[38px] items-center gap-2 text-sm ${legacy ? "cursor-not-allowed text-slate-400" : "cursor-pointer text-slate-700"}`}>
            <input
              type="checkbox"
              checked={form.is_public}
              disabled={legacy}
              onChange={(e) => set("is_public", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            {legacy ? "이전 프로그램은 표시하지 않음" : `표시 (다른 기간 ${otherPublicCount}/${maxPublic})`}
          </label>
          {errors.is_public && <p className="mt-1 text-xs font-medium text-red-600">{errors.is_public}</p>}
        </div>
        <div>
          <label htmlFor={`${idp}-order`} className="mb-1 block text-xs font-medium text-slate-600">
            표시 순서
          </label>
          <input
            id={`${idp}-order`}
            inputMode="numeric"
            autoComplete="off"
            value={form.display_order}
            disabled={legacy}
            onChange={(e) => set("display_order", e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
            placeholder="비우면 마지막 순서"
            className={`w-full rounded-lg border px-3 py-2 text-right text-sm tabular-nums outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100 ${
              errors.display_order ? "border-red-400 bg-red-50/40" : "border-slate-300"
            }`}
          />
          {errors.display_order ? (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.display_order}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-400">{`${MIN_DISPLAY_ORDER}~${MAX_DISPLAY_ORDER}, 작을수록 먼저`}</p>
          )}
        </div>
        <div>
          <p className="mb-1 block text-xs font-medium text-slate-600">사용</p>
          <label className="inline-flex h-[38px] cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            사용 중 (해제 시 홈페이지·신규 수납 선택에서 제외)
          </label>
          {errors.is_active && <p className="mt-1 text-xs font-medium text-red-600">{errors.is_active}</p>}
        </div>
      </fieldset>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          취소
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
          {saving ? "저장 중..." : "설정 저장"}
        </button>
      </div>
    </form>
  );
}
