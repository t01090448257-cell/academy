"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  money,
  dateText,
  PaymentStatusBadge,
  amountDisplay,
  amountInput,
} from "./PaymentBadges";

const refundStatusLabel: Record<string, string> = {
  requested: "요청",
  completed: "완료",
  cancelled: "취소",
};

export default function EnrollmentDetail({ id }: { id: string }) {
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [refund, setRefund] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "", payment_method: "bank_transfer", payment_date: "",
    payer_name: "", transaction_id: "", memo: "",
  });

  const policyAmount = d?.refundPolicy?.refundableAmount ? Number(d.refundPolicy.refundableAmount) : 0;

  async function load() {
    const r = await fetch(`/api/enrollments/${id}`, { cache: "no-store" });
    const x = await r.json();
    if (!r.ok) {
      setError(x.message);
      return;
    }
    setD(x.enrollment);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function addPay() {
    setBusy(true);
    const r = await fetch(`/api/enrollments/${id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, payment_method: method }),
    });
    const x = await r.json();
    if (!r.ok) alert(x.message);
    else {
      setAmount("");
      await load();
    }
    setBusy(false);
  }

  async function addRefund() {
    const requested = Number(refund);
    const available = policyAmount;

    if (!Number.isFinite(requested) || requested <= 0) {
      alert("환불 금액을 입력해 주세요.");
      return;
    }

    if (requested > available) {
      alert(`입력한 환불 금액이 현재 환불 가능액보다 큽니다.\n\n환불 가능액: ${money(available)}\n입력 금액: ${money(requested)}`);
      return;
    }

    if (requested < available) {
      const ok = window.confirm(
        `입력한 환불 금액이 현재 환불 가능액보다 작습니다.\n\n환불 가능액: ${money(available)}\n입력 금액: ${money(requested)}\n\n이 금액으로 부분 환불을 신청하시겠습니까?`
      );
      if (!ok) return;
    }

    setBusy(true);
    const r = await fetch(`/api/enrollments/${id}/refunds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refund_amount: refund,
        refund_method: "bank_transfer",
        refund_reason: "관리자 환불",
      }),
    });
    const x = await r.json();
    if (!r.ok) alert(x.message);
    else {
      setRefund("");
      await load();
    }
    setBusy(false);
  }

  function openPaymentEdit(p: any) {
    setEditingPayment(p);
    setPaymentForm({
      amount: String(p.amount ?? ""),
      payment_method: p.payment_method ?? "bank_transfer",
      payment_date: p.payment_date ? String(p.payment_date).slice(0, 10) : "",
      payer_name: p.payer_name ?? "",
      transaction_id: p.transaction_id ?? "",
      memo: p.memo ?? "",
    });
  }

  async function savePaymentEdit() {
    if (!editingPayment) return;
    const value = Number(paymentForm.amount);
    if (!Number.isFinite(value) || value <= 0) {
      alert("결제 금액을 입력해 주세요.");
      return;
    }
    if (!window.confirm("이 결제 기록을 수정하시겠습니까?\n수정 후 누적 수납액, 미수금, 환불 가능액이 다시 계산됩니다.")) return;

    setBusy(true);
    const r = await fetch(`/api/payments/${editingPayment.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentForm),
    });
    const x = await r.json();
    if (!r.ok) alert(x.message);
    else {
      setEditingPayment(null);
      await load();
    }
    setBusy(false);
  }

  async function cancelPayment(paymentId: string) {
    if (!window.confirm("이 결제 기록을 취소하시겠습니까?\n취소 후 누적 수납액과 환불 가능액에서 제외됩니다.")) return;
    setBusy(true);
    const r = await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
    const x = await r.json();
    if (!r.ok) alert(x.message);
    else await load();
    setBusy(false);
  }

  async function changeRefundStatus(refundId: string, status: "completed" | "cancelled") {
    const message =
      status === "completed"
        ? "이 환불을 실제 환불 완료 처리하시겠습니까?\n완료 후 누적 환불 및 미수금에 반영됩니다."
        : "이 환불 요청을 취소하시겠습니까?";

    if (!window.confirm(message)) return;

    setBusy(true);
    const r = await fetch(`/api/refunds/${refundId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const x = await r.json();
    if (!r.ok) alert(x.message);
    else await load();
    setBusy(false);
  }

  if (error)
    return <div className="rounded-xl bg-rose-50 p-5 text-rose-700">{error}</div>;
  if (!d) return <div>불러오는 중...</div>;

  return (
    <div>
      <Link href="/admin/payments" className="text-sm text-slate-500">
        ← 수납 목록
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-slate-500">{d.enrollment_no}</p>
          <h1 className="mt-1 text-2xl font-bold">{d.students?.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/payments/${id}/edit`} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">수강 정보 수정</Link>
          <PaymentStatusBadge value={d.summary.status} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl bg-white p-5 shadow">
          <p className="text-xs text-slate-500">기본 수강료</p>
          <p className="mt-2 text-xl font-bold">{money(d.base_amount)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow">
          <p className="text-xs text-slate-500">할인 금액</p>
          <p className="mt-2 text-xl font-bold text-rose-700">-{money(d.discount_amount)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow">
          <p className="text-xs text-slate-500">최종 금액</p>
          <p className="mt-2 text-xl font-bold">{money(d.summary.finalAmount)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow">
          <p className="text-xs text-slate-500">누적 수납</p>
          <p className="mt-2 text-xl font-bold">{money(d.summary.paidAmount)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow">
          <p className="text-xs text-slate-500">미수금</p>
          <p className="mt-2 text-xl font-bold">{money(d.summary.outstandingAmount)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="font-semibold">결제 이력</h2>
          <p className="mt-1 text-xs text-slate-500">
            기본 수강료 {money(d.base_amount)} · 할인 금액 -{money(d.discount_amount)} · 최종 금액 {money(d.summary.finalAmount)}
          </p>

          <div className="mt-4 space-y-2">
            {d.payments.length === 0 ? (
              <p className="text-sm text-slate-500">결제 기록이 없습니다.</p>
            ) : (
              d.payments.map((p: any) => (
                <div className="rounded-lg bg-slate-50 p-3" key={p.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span>{dateText(p.payment_date)} · {p.payment_method}</span>
                    <div className="flex items-center gap-2">
                      <b>{money(p.amount)} {p.status === "cancelled" && "(취소)"}</b>
                      {p.status !== "cancelled" && (
                        <>
                          <button disabled={busy} onClick={() => openPaymentEdit(p)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">수정</button>
                          <button disabled={busy} onClick={() => cancelPayment(String(p.id))} className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700">취소</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 border-t pt-5">
            <h3 className="font-semibold">추가 수납</h3>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                className="w-full rounded-lg border px-3 py-2"
                value={amountDisplay(amount)}
                onChange={(e) => setAmount(amountInput(e.target.value))}
                placeholder="금액"
              />
              <select
                className="rounded-lg border px-3"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="bank_transfer">이체</option>
                <option value="cash">현금</option>
                <option value="card">카드</option>
                <option value="other">기타</option>
              </select>
              <button disabled={busy} onClick={addPay} className="rounded-lg bg-slate-900 px-4 text-white">
                수납
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="font-semibold">환불 이력</h2>
          <p className="mt-1 text-xs text-slate-500">
            완료된 환불만 누적 환불 및 미수금 계산에 반영됩니다.
          </p>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-amber-800">환불 규정 · SYA 기준</p>
                <p className="mt-1 font-semibold text-slate-900">{d.refundPolicy?.label ?? "환불 기준 확인 필요"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">정책상 최대 환불액</p>
                <p className="mt-1 text-lg font-bold text-amber-900">{money(d.refundPolicy?.refundableAmount ?? 0)}</p>
              </div>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">{d.refundPolicy?.detail}</p>
            <p className="mt-1 text-xs font-medium text-amber-800">{d.refundPolicy?.notice}</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">환불 가능액은 할인 적용 후 최종금액이 아니라 실제 완료 수납액을 기준으로 계산합니다. 이미 완료된 환불액은 차감됩니다.</p>
          </div>

          <div className="mt-4 space-y-2">
            {d.refunds.length === 0 ? (
              <p className="text-sm text-slate-500">환불 기록이 없습니다.</p>
            ) : (
              d.refunds.map((r: any) => (
                <div className="rounded-lg bg-slate-50 p-3" key={r.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span>{dateText(r.refund_date)} · {refundStatusLabel[r.status] ?? r.status}</span>
                    <b>{money(r.refund_amount)}</b>
                  </div>

                  {r.status === "requested" && (
                    <div className="mt-3 flex justify-end gap-2 border-t pt-3">
                      <button
                        disabled={busy}
                        onClick={() => changeRefundStatus(String(r.id), "cancelled")}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
                      >
                        요청 취소
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => changeRefundStatus(String(r.id), "completed")}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white"
                      >
                        환불 완료 처리
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="mt-5 border-t pt-5">
            <h3 className="font-semibold">환불 요청</h3>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                className="w-full rounded-lg border px-3 py-2"
                value={amountDisplay(refund)}
                onChange={(e) => setRefund(amountInput(e.target.value))}
                placeholder="환불 금액"
              />
              <button
                disabled={busy}
                onClick={addRefund}
                className="rounded-lg border border-rose-300 px-4 text-rose-700"
              >
                환불 요청
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              현재 기준 환불 가능액: <b className="text-slate-700">{money(policyAmount)}</b> · 환불 규정에 따라 서버에서도 한도를 확인합니다.
            </div>

          </div>
        </section>
      </div>

      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">결제 기록 수정</h2>
                <p className="mt-1 text-xs text-slate-500">수정 후 수납 합계와 환불 가능액이 자동으로 다시 계산됩니다.</p>
              </div>
              <button type="button" onClick={() => setEditingPayment(null)} className="text-sm text-slate-500">닫기</button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">결제 금액
                <input type="text" inputMode="numeric" className="mt-1 w-full rounded-lg border px-3 py-2" value={amountDisplay(paymentForm.amount)} onChange={(e) => setPaymentForm((v) => ({ ...v, amount: amountInput(e.target.value) }))} />
              </label>
              <label className="text-sm">결제 방법
                <select className="mt-1 w-full rounded-lg border px-3 py-2" value={paymentForm.payment_method} onChange={(e) => setPaymentForm((v) => ({ ...v, payment_method: e.target.value }))}>
                  <option value="bank_transfer">계좌이체</option><option value="cash">현금</option><option value="card">카드</option><option value="other">기타</option>
                </select>
              </label>
              <label className="text-sm">결제일
                <input type="date" className="mt-1 w-full rounded-lg border px-3 py-2" value={paymentForm.payment_date} onChange={(e) => setPaymentForm((v) => ({ ...v, payment_date: e.target.value }))} />
              </label>
              <label className="text-sm">입금자명
                <input className="mt-1 w-full rounded-lg border px-3 py-2" value={paymentForm.payer_name} onChange={(e) => setPaymentForm((v) => ({ ...v, payer_name: e.target.value }))} />
              </label>
              <label className="text-sm sm:col-span-2">거래번호
                <input className="mt-1 w-full rounded-lg border px-3 py-2" value={paymentForm.transaction_id} onChange={(e) => setPaymentForm((v) => ({ ...v, transaction_id: e.target.value }))} />
              </label>
              <label className="text-sm sm:col-span-2">메모
                <textarea className="mt-1 min-h-24 w-full rounded-lg border px-3 py-2" value={paymentForm.memo} onChange={(e) => setPaymentForm((v) => ({ ...v, memo: e.target.value }))} />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingPayment(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">취소</button>
              <button type="button" disabled={busy} onClick={savePaymentEdit} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
