"use client";

// 「+ 기간 추가」 입력 (ProgramPriceManager 안에서 사용)
// 저장: POST /api/programs/options — 기간(주수) + 첫 가격(선택) + 홈페이지 표시 설정을 한 번에 저장
// 입력 검사는 서버와 같은 규칙(programOptionValidation / programPriceValidation)이며 최종 판단은 서버가 합니다.

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  PRICE_CURRENCIES,
  normalizePrice,
  priceState,
  todayKst,
  validatePriceInput,
} from "@/lib/programPriceValidation";
import {
  NO_PRICE_PUBLIC_MESSAGE,
  publicLimitMessage,
  validateDurationWeeks,
  validateOptionSettings,
  type OptionErrors,
} from "@/lib/programOptionValidation";
import { MAX_DISPLAY_ORDER, MAX_DURATION_WEEKS, MIN_DISPLAY_ORDER, MIN_DURATION_WEEKS } from "@/config/programPricing";
import type { SaveResult } from "./types";

const INPUT =
  "w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100";

function inputClass(error?: string) {
  return `${INPUT} ${error ? "border-red-400 bg-red-50/40" : "border-slate-300"}`;
}

function Field({ id, label, required, error, hint, children }: { id: string; label: string; required?: boolean; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-red-600">{error}</p> : hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/** "1200000" → "1,200,000" (입력 중 표시용) */
function withCommas(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? digits.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "";
}

export default function OptionCreateForm({
  programId,
  programName,
  existingWeeks,
  publicCount,
  maxPublic,
  onCancel,
  onDone,
}: {
  programId: string;
  programName: string;
  /** 이미 있는 주수 (중복 확인용) */
  existingWeeks: number[];
  /** 현재 홈페이지 표시 중인(활성) 기간 수 */
  publicCount: number;
  maxPublic: number;
  onCancel: () => void;
  onDone: (result: SaveResult) => void;
}) {
  const [form, setForm] = useState({
    duration_weeks: "",
    price: "",
    currency: "KRW",
    valid_from: todayKst(),
    valid_until: "",
    is_active: true,
    is_public: publicCount < maxPublic,
    display_order: "",
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

  function check(): OptionErrors {
    const next: OptionErrors = {};
    const weeks = validateDurationWeeks(form.duration_weeks);
    if (weeks.error) next.duration_weeks = weeks.error;
    else if (weeks.weeks !== null && existingWeeks.includes(weeks.weeks)) next.duration_weeks = `이미 ${weeks.weeks}주 기간이 있습니다.`;

    const settings = validateOptionSettings({ is_public: form.is_public, display_order: form.display_order, is_active: form.is_active });
    Object.assign(next, settings.errors);

    const hasPrice = form.price.trim() !== "";
    if (hasPrice) {
      const price = validatePriceInput({
        price: normalizePrice(form.price) ?? form.price,
        currency: form.currency,
        valid_from: form.valid_from,
        valid_until: form.valid_until,
        is_active: form.is_active,
      });
      Object.assign(next, price.errors);
      if (form.is_public && Object.keys(price.errors).length === 0) {
        const state = priceState(price.data, todayKst());
        if (state !== "current" && state !== "scheduled") next.is_public = NO_PRICE_PUBLIC_MESSAGE;
      }
    } else if (form.is_public) {
      next.is_public = NO_PRICE_PUBLIC_MESSAGE;
    }

    if (form.is_public && form.is_active && publicCount >= maxPublic && !next.is_public) next.is_public = publicLimitMessage();
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;

    const found = check();
    if (Object.values(found).some(Boolean)) {
      setErrors(found);
      return;
    }

    const hasPrice = form.price.trim() !== "";
    const payload = {
      program_id: programId,
      duration_weeks: form.duration_weeks.trim(),
      is_active: form.is_active,
      is_public: form.is_public,
      display_order: form.display_order.trim(),
      ...(hasPrice
        ? {
            price: normalizePrice(form.price) ?? form.price,
            currency: form.currency,
            valid_from: form.valid_from,
            valid_until: form.valid_until,
          }
        : {}),
    };

    savingRef.current = true;
    setSaving(true);
    setFormError("");
    let finished = false;
    try {
      const response = await fetch("/api/programs/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.status === 401) {
        onDone({ kind: "sessionExpired" });
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        setErrors(data?.errors ?? {});
        setFormError(data?.message || "기간을 저장하지 못했습니다.");
        return;
      }
      finished = true;
      onDone({ kind: "saved", message: data.message || "저장되었습니다." });
    } catch (error) {
      console.error("기간 저장 오류:", error);
      setFormError("기간 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      if (!finished) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  }

  const idp = `option-new-${programId}`;
  const hasPrice = form.price.trim() !== "";

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-sm font-semibold text-slate-900">{programName} · 기간 추가</p>
      <p className="mt-1 text-xs text-slate-500">
        주수는 자유롭게 입력할 수 있습니다. (예: 2, 4, 6, 8, 10, 12) 금액을 비우면 기간만 추가되며, 가격이 없는 기간은 홈페이지에 표시되지 않습니다.
      </p>

      {formError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</p>}

      <fieldset disabled={saving} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-start">
        <Field id={`${idp}-weeks`} label="주수" required error={errors.duration_weeks} hint={`${MIN_DURATION_WEEKS}~${MAX_DURATION_WEEKS}주`}>
          <div className="flex items-center gap-2">
            <input
              id={`${idp}-weeks`}
              inputMode="numeric"
              autoComplete="off"
              value={form.duration_weeks}
              onChange={(e) => set("duration_weeks", e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
              placeholder="예: 6"
              className={`${inputClass(errors.duration_weeks)} text-right tabular-nums`}
            />
            <span className="shrink-0 text-sm text-slate-600">주</span>
          </div>
        </Field>
        <Field id={`${idp}-amount`} label="금액 (원)" error={errors.price} hint="비우면 가격 없이 기간만 추가">
          <input
            id={`${idp}-amount`}
            inputMode="numeric"
            autoComplete="off"
            value={form.price}
            onChange={(e) => set("price", withCommas(e.target.value))}
            placeholder="예: 4,500,000"
            className={`${inputClass(errors.price)} text-right tabular-nums`}
          />
        </Field>
        <Field id={`${idp}-currency`} label="통화" required error={errors.currency}>
          <select id={`${idp}-currency`} value={form.currency} onChange={(e) => set("currency", e.target.value)} className={`${inputClass(errors.currency)} bg-white`}>
            {PRICE_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field id={`${idp}-from`} label="적용 시작일" required={hasPrice} error={errors.valid_from}>
          <input id={`${idp}-from`} type="date" value={form.valid_from} onChange={(e) => set("valid_from", e.target.value)} className={inputClass(errors.valid_from)} />
        </Field>
        <Field id={`${idp}-until`} label="적용 종료일" error={errors.valid_until} hint="비우면 종료일 없음">
          <input id={`${idp}-until`} type="date" value={form.valid_until} onChange={(e) => set("valid_until", e.target.value)} className={inputClass(errors.valid_until)} />
        </Field>
        <div>
          <p className="mb-1 block text-xs font-medium text-slate-600">활성</p>
          <label className="inline-flex h-[38px] cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            활성 (기간·가격)
          </label>
          {errors.is_active && <p className="mt-1 text-xs font-medium text-red-600">{errors.is_active}</p>}
        </div>
        <div>
          <p className="mb-1 block text-xs font-medium text-slate-600">홈페이지 표시</p>
          <label className="inline-flex h-[38px] cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.is_public} onChange={(e) => set("is_public", e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            표시 ({publicCount}/{maxPublic} 사용 중)
          </label>
          {errors.is_public && <p className="mt-1 text-xs font-medium text-red-600">{errors.is_public}</p>}
        </div>
        <Field
          id={`${idp}-order`}
          label="표시 순서"
          error={errors.display_order}
          hint={`${MIN_DISPLAY_ORDER}~${MAX_DISPLAY_ORDER}, 비우면 마지막 순서`}
        >
          <input
            id={`${idp}-order`}
            inputMode="numeric"
            autoComplete="off"
            value={form.display_order}
            onChange={(e) => set("display_order", e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
            placeholder="예: 2"
            className={`${inputClass(errors.display_order)} text-right tabular-nums`}
          />
        </Field>
      </fieldset>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          취소
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
          {saving ? "저장 중..." : "기간 추가"}
        </button>
      </div>
    </form>
  );
}
