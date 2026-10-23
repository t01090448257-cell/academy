"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { amountDisplay, amountInput } from "./PaymentBadges";

type Props = { enrollmentId: string };

export default function EnrollmentEditForm({ enrollmentId }: Props) {
  const router = useRouter();
  const [d, setD] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [programId, setProgramId] = useState("");
  const [optionId, setOptionId] = useState("");
  const [base, setBase] = useState("");
  const [discount, setDiscount] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [type, setType] = useState("program_and_accommodation");
  const [status, setStatus] = useState("inquiry");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/enrollments/${enrollmentId}`, { cache: "no-store" }).then(async (r) => {
        const x = await r.json();
        if (!r.ok) throw new Error(x.message || "수강 정보를 불러오지 못했습니다.");
        return x.enrollment;
      }),
      fetch("/api/programs", { cache: "no-store" }).then(async (r) => {
        const x = await r.json();
        if (!r.ok) throw new Error(x.message || "프로그램 정보를 불러오지 못했습니다.");
        return x.programs ?? [];
      }),
    ])
      .then(([enrollment, programRows]) => {
        setD(enrollment);
        setPrograms(programRows);
        setProgramId(enrollment.program_id ? String(enrollment.program_id) : "");
        setOptionId(enrollment.program_option_id ? String(enrollment.program_option_id) : "");
        setBase(String(enrollment.base_amount ?? "0"));
        setDiscount(String(enrollment.discount_amount ?? "0"));
        setStart(enrollment.start_date ? String(enrollment.start_date).slice(0, 10) : "");
        setEnd(enrollment.end_date ? String(enrollment.end_date).slice(0, 10) : "");
        setType(enrollment.enrollment_type ?? "program_and_accommodation");
        setStatus(enrollment.status ?? "inquiry");
        setMemo(enrollment.memo ?? "");
      })
      .catch((e) => setError(e.message || "불러오기에 실패했습니다."))
      .finally(() => setLoading(false));
  }, [enrollmentId]);

  const opts = useMemo(
    () => programs.find((p) => String(p.id) === programId)?.program_options ?? [],
    [programs, programId]
  );

  const finalAmount = Math.max(0, (Number(base) || 0) - (Number(discount) || 0));
  const paidAmount = Number(d?.summary?.paidAmount ?? 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (finalAmount < paidAmount) {
      setError(`현재 누적 수납액 ${paidAmount.toLocaleString("ko-KR")}원보다 최종 금액을 낮출 수 없습니다.`);
      return;
    }
    if (!window.confirm("수강 등록 정보를 수정하시겠습니까?\n수강료가 변경되면 미수금과 환불 가능액도 다시 계산됩니다.")) return;

    setSaving(true);
    setError("");
    try {
      const r = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: String(d.students?.id ?? d.student_id),
          program_id: programId || null,
          program_option_id: optionId || null,
          base_amount: base || 0,
          discount_amount: discount || 0,
          start_date: start || null,
          end_date: end || null,
          enrollment_type: type,
          status,
          memo: memo || null,
        }),
      });
      const x = await r.json();
      if (!r.ok) throw new Error(x.message || "수정에 실패했습니다.");
      router.push(`/admin/payments/${enrollmentId}`);
      router.refresh();
    } catch (e: any) {
      setError(e.message || "수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="rounded-xl bg-white p-6 shadow">불러오는 중...</div>;
  if (!d) return <div className="rounded-xl bg-rose-50 p-5 text-rose-700">{error || "수강 정보를 찾을 수 없습니다."}</div>;

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="rounded-xl bg-emerald-50 p-4">
        <p className="text-xs text-emerald-700">학생</p>
        <p className="mt-1 font-semibold text-slate-900">{d.students?.name ?? "-"}</p>
        <p className="text-xs text-slate-500">{d.students?.student_no ?? ""} · 등록번호 {d.enrollment_no}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">프로그램
          <select className="mt-1 w-full rounded-lg border px-3 py-2" value={programId} onChange={(e) => { setProgramId(e.target.value); setOptionId(""); }}>
            <option value="">직접 입력</option>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <label className="text-sm">기간 옵션
          <select className="mt-1 w-full rounded-lg border px-3 py-2" value={optionId} onChange={(e) => setOptionId(e.target.value)}>
            <option value="">선택 안 함</option>
            {opts.filter((o: any) => o.is_active).map((o: any) => <option key={o.id} value={o.id}>{o.name} ({o.duration_weeks}주)</option>)}
          </select>
        </label>

        <label className="text-sm">기본 수강료
          <input className="mt-1 w-full rounded-lg border px-3 py-2" type="text" inputMode="numeric" value={amountDisplay(base)} onChange={(e) => setBase(amountInput(e.target.value))} />
        </label>

        <label className="text-sm">할인 금액
          <input className="mt-1 w-full rounded-lg border px-3 py-2" type="text" inputMode="numeric" value={amountDisplay(discount)} onChange={(e) => setDiscount(amountInput(e.target.value))} />
        </label>

        <label className="text-sm">시작일
          <input className="mt-1 w-full rounded-lg border px-3 py-2" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>

        <label className="text-sm">종료일
          <input className="mt-1 w-full rounded-lg border px-3 py-2" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>

      <div className="rounded-xl bg-slate-50 p-4">
        <div className="flex justify-between"><span className="font-semibold">최종 금액</span><strong>{finalAmount.toLocaleString("ko-KR")}원</strong></div>
        <div className="mt-2 flex justify-between text-sm"><span className="text-slate-500">현재 누적 수납</span><span>{paidAmount.toLocaleString("ko-KR")}원</span></div>
        <p className="mt-2 text-xs text-slate-500">최종 금액을 현재 누적 수납액보다 낮게 수정할 수 없습니다.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">등록 유형
          <select className="mt-1 w-full rounded-lg border px-3 py-2" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="program_and_accommodation">수강+숙박</option>
            <option value="program_only">수강만</option>
            <option value="accommodation_only">숙박만</option>
          </select>
        </label>
        <label className="text-sm">상태
          <select className="mt-1 w-full rounded-lg border px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="inquiry">문의</option><option value="reserved">예약</option><option value="active">진행</option><option value="completed">완료</option><option value="cancelled">취소</option>
          </select>
        </label>
      </div>

      <label className="block text-sm">메모
        <textarea className="mt-1 min-h-28 w-full rounded-lg border px-3 py-2" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="관리 메모" />
      </label>

      <div className="flex gap-2">
        <button type="button" onClick={() => router.back()} className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">취소</button>
        <button disabled={saving} className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{saving ? "저장 중..." : "수강 정보 저장"}</button>
      </div>
    </form>
  );
}
