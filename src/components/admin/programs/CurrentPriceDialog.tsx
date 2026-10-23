"use client";

// 「현재 적용 가격으로 선택」 확인창 (ProgramPriceManager의 가격 이력 라디오에서 사용)
// 확인 → POST /api/programs/prices/[id]/current (서버가 트랜잭션으로 처리, 결과를 DB 기준으로 다시 확인)
// 가격 이력 수정(PriceForm)과는 다른 동작: 금액은 바꾸지 않고 "오늘부터 적용되는 가격"만 바꿉니다.

import { useEffect, useRef, useState } from "react";
import { formatWon, planCurrentPrice, todayKst } from "@/lib/programPriceValidation";
import type { PriceRow } from "./PriceForm";

export type CurrentPriceResult = { kind: "saved"; message: string } | { kind: "sessionExpired" };

export default function CurrentPriceDialog({
  optionLabel,
  target,
  rows,
  today,
  onCancel,
  onDone,
}: {
  optionLabel: string;
  /** 현재 적용 가격으로 선택한 가격 */
  target: PriceRow;
  /** 같은 기간 옵션의 가격 이력 전체 (미리보기용) */
  rows: PriceRow[];
  today?: string;
  onCancel: () => void;
  onDone: (result: CurrentPriceResult) => void;
}) {
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState("");
  const confirmRef = useRef<HTMLButtonElement>(null);

  // 미리보기 (최종 처리는 서버가 DB의 최신 값으로 다시 계산)
  const base = today || todayKst();
  const plan = planCurrentPrice(rows, target.id, base);
  const deactivating = plan ? rows.filter((row) => plan.deactivateIds.includes(row.id)) : [];

  useEffect(() => {
    confirmRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !savingRef.current) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  async function apply() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    let finished = false;
    try {
      const response = await fetch(`/api/programs/prices/${encodeURIComponent(target.id)}/current`, { method: "POST" });
      if (response.status === 401) {
        finished = true;
        onDone({ kind: "sessionExpired" });
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        setError(data?.message || "현재 적용 가격을 변경하지 못했습니다.");
        return;
      }
      finished = true;
      onDone({ kind: "saved", message: data.message || "현재 적용 가격을 변경했습니다." });
    } catch (err) {
      console.error("현재 적용 가격 변경 오류:", err);
      setError("현재 적용 가격을 변경하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      if (!finished) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  }

  const priceText = formatWon(target.price);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center" onClick={() => !saving && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="current-price-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6"
      >
        <p className="text-xs font-semibold text-slate-400">{optionLabel}</p>
        <h2 id="current-price-title" className="mt-1 text-base font-semibold text-slate-900">
          {priceText}을(를) 현재 적용 가격으로 변경하시겠습니까?
        </h2>

        {plan && (
          <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
            {deactivating.length > 0 && (
              <li>• 현재 적용 중인 {deactivating.map((row) => formatWon(row.price)).join(", ")}은(는) 비활성 처리됩니다.</li>
            )}
            <li>
              • {base}부터 수납 등록의 기본 수강료로 {priceText}이(가) 사용됩니다.
            </li>
            {plan.periodChanged && (
              <li>
                • 선택한 가격의 적용 기간이 {plan.valid_from} ~ {plan.valid_until ?? "종료일 없음"}(으)로 조정됩니다.
              </li>
            )}
            {plan.nextScheduled && (
              <li>
                • {plan.nextScheduled.valid_from.slice(0, 10)}부터는 예정된 가격
                {plan.nextScheduled.price ? ` ${formatWon(plan.nextScheduled.price)}` : ""}이(가) 그대로 적용됩니다.
              </li>
            )}
            <li className="text-xs text-slate-400">가격 이력은 삭제되지 않고, 변경 내용은 관리 기록에 남습니다.</li>
          </ul>
        )}

        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            취소
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={apply}
            disabled={saving}
            className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "적용 중..." : "현재 가격으로 적용"}
          </button>
        </div>
      </div>
    </div>
  );
}
