"use client";

// 기간 「수정」 패널 (ProgramPriceManager 안에서 사용)
// 금액·통화·적용 시작일·적용 종료일 + 기간 사용(활성) + 홈페이지 표시 + 표시 순서를 한 화면에서 저장합니다.
// 저장: POST /api/programs/options/[id]/edit (하나의 트랜잭션)
//
// 가격 이력 보존 — 처리 계획은 서버와 같은 planPriceEdit() 로 미리 보여 줍니다.
//   - 금액을 바꾸면 기존 가격 행을 덮어쓰지 않고 새 가격 행을 추가하고, 기존 가격은 새 시작일 전날로 종료(이력 유지)
//   - 금액을 바꾸면 적용 시작일은 자동으로 오늘이 됩니다. (직접 바꾸면 그 날짜 사용)
//   - 종료일만 바꾸면 지금 가격 행의 종료일만 조정

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  PRICE_CURRENCIES,
  formatWon,
  normalizePrice,
  priceState,
  todayKst,
  validatePriceInput,
} from "@/lib/programPriceValidation";
import {
  NO_PRICE_PUBLIC_MESSAGE,
  publicLimitMessage,
  validateOptionSettings,
  type OptionErrors,
} from "@/lib/programOptionValidation";
import { planPriceEdit } from "@/lib/priceEditPlan";
import { MAX_DISPLAY_ORDER, MIN_DISPLAY_ORDER } from "@/config/programPricing";
import type { PriceRow } from "./PriceForm";
import type { OptionRow, SaveResult } from "./types";

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

const plain = (value: string) => value.replace(/\.0+$/, "");

export default function OptionEditForm({
  option,
  label,
  prices,
  base,
  today = todayKst(),
  otherPublicCount,
  maxPublic,
  legacy,
  onCancel,
  onDone,
}: {
  option: OptionRow;
  label: string;
  /** 이 기간의 가격 이력 전체 */
  prices: PriceRow[];
  /** 수정 기준 가격: 현재 적용 가격, 없으면 적용 예정 가격, 없으면 null */
  base: PriceRow | null;
  today?: string;
  /** 이 기간을 제외하고 홈페이지 표시 중인(활성) 기간 수 */
  otherPublicCount: number;
  maxPublic: number;
  /** 이전 REGULAR/CAMP 프로그램 (홈페이지 표시 불가) */
  legacy: boolean;
  onCancel: () => void;
  onDone: (result: SaveResult) => void;
}) {
  const baseFrom = base ? base.valid_from.slice(0, 10) : today;
  const [form, setForm] = useState({
    price: base ? withCommas(plain(base.price)) : "",
    currency: base?.currency?.trim() || "KRW",
    valid_from: baseFrom,
    valid_until: base?.valid_until ? base.valid_until.slice(0, 10) : "",
    is_active: option.is_active,
    is_public: option.is_public,
    display_order: option.display_order !== null ? String(option.display_order) : "",
  });
  const [fromTouched, setFromTouched] = useState(false);
  const [errors, setErrors] = useState<OptionErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // 금액을 바꾸면 (시작일을 직접 고치지 않은 경우) 새 금액은 오늘부터 적용
      if (key === "price" && base && !fromTouched) {
        const changed = (normalizePrice(String(value)) ?? "") !== plain(base.price);
        next.valid_from = changed && baseFrom < today ? today : baseFrom;
      }
      return next;
    });
    if (key === "valid_from") setFromTouched(true);
    if (errors[key as string]) setErrors((prev) => ({ ...prev, [key]: "" }));
    if (formError) setFormError("");
  }

  const hasPrice = form.price.trim() !== "";
  const priceCheck = hasPrice
    ? validatePriceInput({
        price: normalizePrice(form.price) ?? form.price,
        currency: form.currency,
        valid_from: form.valid_from,
        valid_until: form.valid_until,
        is_active: true,
      })
    : null;
  const priceValid = !!priceCheck && Object.keys(priceCheck.errors).length === 0;
  const plan = priceValid && priceCheck ? planPriceEdit(prices, base, priceCheck.data) : null;

  // 저장 후 홈페이지 표시 조건 (활성 가격이 적용 중이거나 예정인지) — 미리보기용, 최종 판단은 서버
  const willHaveUsablePrice =
    (plan && plan.kind !== "none" && plan.kind !== "error" && priceCheck && ["current", "scheduled"].includes(priceState(priceCheck.data, today))) ||
    prices.some((row) => ["current", "scheduled"].includes(priceState(row, today)));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;

    const found: OptionErrors = { ...validateOptionSettings(form).errors };
    if (priceCheck) Object.assign(found, priceCheck.errors);
    if (!hasPrice && base) found.price = "금액을 입력해 주세요.";
    if (plan?.kind === "error") found.valid_until = plan.message;
    if (form.is_public && !legacy && !option.is_public && !willHaveUsablePrice) found.is_public = NO_PRICE_PUBLIC_MESSAGE;
    if (form.is_public && form.is_active && otherPublicCount >= maxPublic) found.is_public = publicLimitMessage();
    if (Object.values(found).some(Boolean)) {
      setErrors(found);
      return;
    }

    const payload = {
      base_price_id: base ? base.id : null,
      ...(hasPrice
        ? {
            price: normalizePrice(form.price) ?? form.price,
            currency: form.currency,
            valid_from: form.valid_from,
            valid_until: form.valid_until,
          }
        : {}),
      is_active: form.is_active,
      is_public: legacy ? false : form.is_public,
      display_order: form.display_order.trim(),
    };

    savingRef.current = true;
    setSaving(true);
    setFormError("");
    let finished = false;
    try {
      const response = await fetch(`/api/programs/options/${encodeURIComponent(option.id)}/edit`, {
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
        setFormError(data?.message || "수정 내용을 저장하지 못했습니다.");
        return;
      }
      finished = true;
      onDone({ kind: "saved", message: data.message || "저장되었습니다." });
    } catch (error) {
      console.error("기간 수정 저장 오류:", error);
      setFormError("저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      if (!finished) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  }

  const idp = `option-edit-${option.id}`;

  let preview: { tone: "info" | "warn"; text: string } | null = null;
  if (plan?.kind === "none") preview = { tone: "info", text: "가격은 바뀌지 않습니다." };
  else if (plan?.kind === "adjustUntil") preview = { tone: "info", text: `지금 가격 ${formatWon(base?.price)}의 적용 종료일만 ${plan.valid_until ?? "종료일 없음"}(으)로 바뀝니다.` };
  else if (plan?.kind === "newPrice" && priceCheck) {
    const parts = [`새 가격 ${formatWon(priceCheck.data.price)}이(가) ${priceCheck.data.valid_from}부터 적용됩니다.`];
    if (plan.close.length > 0) parts.push(`기존 가격 ${plan.close.map((c) => formatWon(c.price)).join(", ")}은(는) ${plan.close[0].valid_until}까지로 종료되어 가격 이력에 남습니다.`);
    if (plan.deactivate.length > 0) parts.push(`같은 기간의 가격 ${plan.deactivate.map((d) => formatWon(d.price)).join(", ")}은(는) 비활성으로 바뀌어 가격 이력에 남습니다.`);
    preview = { tone: plan.deactivate.length > 0 ? "warn" : "info", text: parts.join(" ") };
  } else if (plan?.kind === "error") preview = { tone: "warn", text: plan.message };

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-sm font-semibold text-slate-900">{label} · 수정</p>
      <p className="mt-1 text-xs text-slate-500">
        금액을 바꾸면 기존 가격은 지워지지 않고 가격 이력에 남습니다. 새 기간(주수)을 만들 때만 「+ 기간 추가」를 사용하세요.
      </p>

      {formError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</p>}

      <fieldset disabled={saving} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-start">
        <Field id={`${idp}-amount`} label="금액 (원)" required={!!base} error={errors.price} hint={base ? `지금: ${formatWon(base.price)}` : "가격이 아직 없습니다"}>
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
            이 기간 사용
          </label>
          {errors.is_active ? (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.is_active}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-400">해제 시 홈페이지·신규 수납 선택에서 제외</p>
          )}
        </div>
        <div>
          <p className="mb-1 block text-xs font-medium text-slate-600">홈페이지 표시</p>
          <label className={`inline-flex h-[38px] items-center gap-2 text-sm ${legacy ? "cursor-not-allowed text-slate-400" : "cursor-pointer text-slate-700"}`}>
            <input
              type="checkbox"
              checked={!legacy && form.is_public}
              disabled={legacy}
              onChange={(e) => set("is_public", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            {legacy ? "이전 프로그램은 표시하지 않음" : `표시 (다른 기간 ${otherPublicCount}/${maxPublic})`}
          </label>
          {errors.is_public && <p className="mt-1 text-xs font-medium text-red-600">{errors.is_public}</p>}
        </div>
        <Field id={`${idp}-order`} label="홈페이지 표시 순서" error={errors.display_order} hint={`${MIN_DISPLAY_ORDER}~${MAX_DISPLAY_ORDER}, 비우면 마지막 순서`}>
          <input
            id={`${idp}-order`}
            inputMode="numeric"
            autoComplete="off"
            value={form.display_order}
            disabled={legacy}
            onChange={(e) => set("display_order", e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
            placeholder="예: 2"
            className={`${inputClass(errors.display_order)} text-right tabular-nums`}
          />
        </Field>
      </fieldset>

      {preview && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-xs ${preview.tone === "warn" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800"}`}>{preview.text}</p>
      )}

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          닫기
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
