"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StudentPicker from "./StudentPicker";
import { amountDisplay, amountInput } from "./PaymentBadges";

type Program = {
  id: string;
  name: string;
  program_options?: Array<{
    id: string;
    name: string;
    duration_weeks: number;
    is_active: boolean;
  }>;
};

export default function EnrollmentForm({ studentId }: { studentId?: string }) {
  const router = useRouter();
  const [student, setStudent] = useState(studentId ?? "");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState("");
  const [optionId, setOptionId] = useState("");
  const [base, setBase] = useState("");
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceMessage, setPriceMessage] = useState("");
  const [discount, setDiscount] = useState("0");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [type, setType] = useState("program_and_accommodation");
  const [status, setStatus] = useState("inquiry");
  const [first, setFirst] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/programs", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPrograms(d.programs ?? []))
      .catch(() => setError("프로그램 정보를 불러오지 못했습니다."));
  }, []);

  const opts = useMemo(
    () => programs.find((p) => String(p.id) === programId)?.program_options ?? [],
    [programs, programId]
  );

  // 프로그램·기간을 선택하면 수강 시작일 기준의 현재 적용 가격을 서버에서 조회한다.
  // 화면의 금액은 표시용일 뿐이며, 최종 저장 시 서버에서도 다시 검증한다.
  useEffect(() => {
    if (!optionId) {
      setBase("");
      setPriceMessage("");
      return;
    }

    const controller = new AbortController();
    setPriceLoading(true);
    setPriceMessage("");

    const query = new URLSearchParams({ optionId });
    if (start) query.set("date", start);

    fetch(`/api/programs/current-price?${query.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || "가격 정보를 불러오지 못했습니다.");
        if (!d.price) {
          setBase("");
          setPriceMessage(d.message || "해당 날짜의 적용 가격이 없습니다.");
          return;
        }
        setBase(String(d.price.price));
        setPriceMessage(
          `${Number(d.price.price).toLocaleString("ko-KR")}원 · ${d.date} 기준 현재 적용 가격`
        );
      })
      .catch((e) => {
        if (e?.name !== "AbortError") {
          setBase("");
          setPriceMessage(e.message || "가격 정보를 불러오지 못했습니다.");
        }
      })
      .finally(() => setPriceLoading(false));

    return () => controller.abort();
  }, [optionId, start]);

  const finalAmount = Math.max(
    0,
    (Number(base) || 0) - (Number(discount) || 0)
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student,
          program_id: programId || null,
          program_option_id: optionId || null,
          // 기간 옵션을 선택한 경우 서버가 DB의 현재 적용 가격으로 재계산한다.
          base_amount: base,
          discount_amount: discount,
          start_date: start || null,
          end_date: end || null,
          enrollment_type: type,
          status,
          first_payment: first
            ? { amount: first, payment_method: method }
            : undefined,
        }),
      });

      const d = await response.json();
      if (!response.ok) throw new Error(d.message || "저장에 실패했습니다.");
      router.push(`/admin/payments/${d.enrollment.id}?created=1`);
    } catch (e: any) {
      setError(e.message || "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const hasProgramOption = Boolean(optionId);

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <StudentPicker value={student} onChange={setStudent} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          프로그램
          <select
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={programId}
            onChange={(e) => {
              setProgramId(e.target.value);
              setOptionId("");
              setBase("");
              setPriceMessage("");
            }}
          >
            <option value="">직접 입력</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          기간 옵션
          <select
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={optionId}
            onChange={(e) => setOptionId(e.target.value)}
          >
            <option value="">선택 안 함</option>
            {opts
              .filter((o) => o.is_active)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.duration_weeks}주)
                </option>
              ))}
          </select>
        </label>

        <label className="text-sm">
          기본 수강료
          <input
            required
            type="text"
            inputMode="numeric"
            readOnly={hasProgramOption}
            className={`mt-1 w-full rounded-lg border px-3 py-2 ${
              hasProgramOption ? "bg-slate-50 text-slate-700" : ""
            }`}
            value={amountDisplay(base)}
            onChange={(e) => setBase(amountInput(e.target.value))}
          />
          {priceLoading && (
            <p className="mt-1 text-xs text-slate-500">적용 가격 확인 중...</p>
          )}
          {!priceLoading && priceMessage && (
            <p className="mt-1 text-xs text-slate-600">{priceMessage}</p>
          )}
          {hasProgramOption && !start && (
            <p className="mt-1 text-xs text-amber-700">
              수강 시작일을 입력하면 해당 날짜 기준의 가격을 조회합니다.
            </p>
          )}
        </label>

        <label className="text-sm">
          할인 금액
          <input
            type="text"
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={amountDisplay(discount)}
            onChange={(e) => setDiscount(amountInput(e.target.value))}
          />
        </label>

        <label className="text-sm">
          시작일
          <input
            type="date"
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>

        <label className="text-sm">
          종료일
          <input
            type="date"
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
      </div>

      <div className="rounded-xl bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">최종 금액</h2>
          <strong className="text-lg">
            {finalAmount.toLocaleString("ko-KR")}원
          </strong>
        </div>
        {hasProgramOption && (
          <p className="mt-2 text-xs text-slate-500">
            프로그램 관리에서 현재 적용된 가격을 기준으로 서버에서 최종 금액을 다시 계산합니다.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          등록 유형
          <select
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="program_and_accommodation">수강+숙박</option>
            <option value="program_only">수강만</option>
            <option value="accommodation_only">숙박만</option>
          </select>
        </label>

        <label className="text-sm">
          상태
          <select
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="inquiry">문의</option>
            <option value="reserved">예약</option>
            <option value="active">진행</option>
            <option value="completed">완료</option>
            <option value="cancelled">취소</option>
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold">수강 금액</h2>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">기본 수강료</span><strong>{(Number(base) || 0).toLocaleString("ko-KR")}원</strong></div>
          <div className="flex justify-between"><span className="text-slate-500">할인 금액</span><strong className="text-rose-700">-{(Number(discount) || 0).toLocaleString("ko-KR")}원</strong></div>
          <div className="flex justify-between border-t pt-2 text-base"><span className="font-semibold">최종 금액</span><strong>{finalAmount.toLocaleString("ko-KR")}원</strong></div>
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 p-4">
        <h2 className="font-semibold">첫 수납(선택)</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            금액
            <input
              type="text"
              inputMode="numeric"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={amountDisplay(first)}
              onChange={(e) => setFirst(amountInput(e.target.value))}
              placeholder="금액"
            />
          </label>
          <label className="text-sm">
            결제방법
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="bank_transfer">계좌이체</option>
              <option value="cash">현금</option>
              <option value="card">카드</option>
              <option value="other">기타</option>
            </select>
          </label>
        </div>
      </div>

      <button
        disabled={saving || priceLoading || !student || (hasProgramOption && !base)}
        className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
      >
        {saving ? "저장 중..." : "수강 등록"}
      </button>
    </form>
  );
}
