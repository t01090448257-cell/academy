"use client";

// 기간 옵션 가격 등록·수정 입력 (ProgramPriceManager 안에서 사용)
// 등록: POST /api/programs/prices, 수정: PUT /api/programs/prices/[id]
// 입력 검사는 서버와 같은 규칙(src/lib/programPriceValidation.ts)

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  PRICE_CURRENCIES,
  formatWon,
  normalizePrice,
  periodsOverlap,
  previousDay,
  todayKst,
  validatePriceInput,
  type PriceErrors,
} from "@/lib/programPriceValidation";

export interface PriceRow {
  id: string;
  program_option_id: string;
  price: string;
  currency: string;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export type SaveResult =
  | { kind: "saved"; message: string }
  | { kind: "sessionExpired" };

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

export default function PriceForm({
  optionId,
  optionLabel,
  editing,
  existing,
  onCancel,
  onDone,
}: {
  optionId: string;
  optionLabel: string;
  /** 수정할 가격 (없으면 새 가격 등록) */
  editing: PriceRow | null;
  /** 이 기간 옵션의 가격 이력 (기간 겹침 미리보기용) */
  existing: PriceRow[];
  onCancel: () => void;
  onDone: (result: SaveResult) => void;
}) {
  const [form, setForm] = useState({
    price: editing ? withCommas(editing.price.replace(/\.0+$/, "")) : "",
    currency: editing?.currency?.trim() || "KRW",
    valid_from: editing ? editing.valid_from.slice(0, 10) : todayKst(),
    valid_until: editing?.valid_until ? editing.valid_until.slice(0, 10) : "",
    is_active: editing ? editing.is_active : true,
  });
  const [errors, setErrors] = useState<PriceErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) setErrors((prev) => ({ ...prev, [key]: "" }));
    if (formError) setFormError("");
  }

  // 저장 전 미리보기: 겹치는 활성 가격과 처리 방법 (최종 판단은 서버)
  const others = existing.filter((row) => row.is_active && row.id !== editing?.id);
  const from = form.valid_from;
  const until = form.valid_until || null;
  const overlaps = form.is_active && from ? others.filter((row) => periodsOverlap(row.valid_from.slice(0, 10), row.valid_until?.slice(0, 10) ?? null, from, until)) : [];
  const closable = !editing && until === null && overlaps.length > 0 && overlaps.every((row) => row.valid_from.slice(0, 10) < from);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;

    const payload = {
      ...(editing ? {} : { program_option_id: optionId }),
      price: normalizePrice(form.price) ?? form.price,
      currency: form.currency,
      valid_from: form.valid_from,
      valid_until: form.valid_until,
      is_active: form.is_active,
    };
    const check = validatePriceInput(payload);
    if (Object.keys(check.errors).length > 0) {
      setErrors(check.errors);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setFormError("");
    let finished = false;
    try {
      const response = await fetch(editing ? `/api/programs/prices/${encodeURIComponent(editing.id)}` : "/api/programs/prices", {
        method: editing ? "PUT" : "POST",
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
        setFormError(data?.message || "가격을 저장하지 못했습니다.");
        return;
      }
      finished = true;
      onDone({ kind: "saved", message: data.message || "저장되었습니다." });
    } catch (error) {
      console.error("가격 저장 오류:", error);
      setFormError("가격 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      if (!finished) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  }

  const idp = `price-${optionId}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-sm font-semibold text-slate-900">
        {optionLabel} · {editing ? "가격 수정" : "새 가격 등록"}
      </p>
      {editing && (
        <p className="mt-1 text-xs text-slate-500">
          금액을 바꾸는 경우(예: 인상)에는 이 행을 수정하기보다 「새 가격 등록」으로 추가하면 이전 가격 이력이 남습니다.
        </p>
      )}

      {formError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</p>}

      <fieldset disabled={saving} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-start">
        <Field id={`${idp}-amount`} label="금액 (원)" required error={errors.price}>
          <input
            id={`${idp}-amount`}
            inputMode="numeric"
            autoComplete="off"
            value={form.price}
            onChange={(e) => set("price", withCommas(e.target.value))}
            placeholder="예: 1,200,000"
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
        <Field id={`${idp}-from`} label="적용 시작일" required error={errors.valid_from}>
          <input id={`${idp}-from`} type="date" value={form.valid_from} onChange={(e) => set("valid_from", e.target.value)} className={inputClass(errors.valid_from)} />
        </Field>
        <Field id={`${idp}-until`} label="적용 종료일" error={errors.valid_until} hint="비우면 종료일 없음">
          <input id={`${idp}-until`} type="date" value={form.valid_until} onChange={(e) => set("valid_until", e.target.value)} className={inputClass(errors.valid_until)} />
        </Field>
        <div>
          <p className="mb-1 block text-xs font-medium text-slate-600">상태</p>
          <label className="inline-flex h-[38px] cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            활성
          </label>
        </div>
      </fieldset>

      {overlaps.length > 0 && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-xs ${closable ? "bg-sky-50 text-sky-800" : "bg-amber-50 text-amber-800"}`}>
          {closable
            ? `저장하면 기존 가격 ${overlaps.map((row) => `${formatWon(row.price)}(${row.valid_from.slice(0, 10)}~)`).join(", ")}은(는) ${previousDay(from)}까지 적용되도록 종료 처리됩니다. 기존 가격 이력은 그대로 남습니다.`
            : `적용 기간이 겹치는 활성 가격이 있습니다: ${overlaps.map((row) => `${formatWon(row.price)} (${row.valid_from.slice(0, 10)} ~ ${row.valid_until?.slice(0, 10) ?? "종료일 없음"})`).join(", ")}. 기간을 조정하거나 기존 가격을 비활성화해 주세요.`}
        </p>
      )}

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          취소
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
          {saving ? "저장 중..." : editing ? "수정 저장" : "가격 등록"}
        </button>
      </div>
    </form>
  );
}
