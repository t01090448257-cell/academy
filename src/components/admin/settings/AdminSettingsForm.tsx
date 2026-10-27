"use client";

import { useEffect, useState } from "react";

interface Settings {
  academy_name: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  local_phone: string;
  korea_office_address: string;
  philippines_office_address: string;
  default_currency: string;
  default_payment_method: string;
  default_enrollment_status: string;
  updated_at?: string;
}

const initial: Settings = {
  academy_name: "SYA Academy",
  contact_phone: "",
  contact_email: "",
  address: "",
  local_phone: "",
  korea_office_address: "",
  philippines_office_address: "",
  default_currency: "KRW",
  default_payment_method: "bank_transfer",
  default_enrollment_status: "inquiry",
};

const paymentMethods = [
  ["bank_transfer", "계좌이체"],
  ["card", "카드"],
  ["cash", "현금"],
];

const enrollmentStatuses = [
  ["inquiry", "문의"],
  ["reserved", "예약"],
  ["confirmed", "확정"],
  ["completed", "완료"],
];

export default function AdminSettingsForm() {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || !data.success) throw new Error(data.message || "설정을 불러오지 못했습니다.");
        // 이전 버전 API 응답에 새 항목이 없더라도 입력란이 비어 있도록 초기값과 합침
        setForm({ ...initial, ...data.settings });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "설정을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  function setField<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage("");
    setError("");
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "저장하지 못했습니다.");
      setForm({ ...initial, ...data.settings });
      setMessage("설정이 저장되었습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "설정 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">설정을 불러오는 중입니다...</div>;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="font-bold text-slate-900">학원 기본정보</h2>
          <p className="mt-1 text-xs text-slate-500">관리자와 내부 운영 화면에서 사용할 기본 정보입니다.</p>
          <p className="mt-1 text-xs text-slate-500">
            연락처와 주소는 홈페이지 하단(Footer), 상담 카드, 학원소개 「오시는 길」에 표시됩니다. 비워 두면 기존 홈페이지 기본값이 표시됩니다.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="학원명" value={form.academy_name} onChange={(v) => setField("academy_name", v)} required />
          <Field label="상담 이메일" value={form.contact_email} onChange={(v) => setField("contact_email", v)} type="email" placeholder="예: admissions@sya-academy.com" maxLength={255} />
          <Field label="한국 상담전화" value={form.contact_phone} onChange={(v) => setField("contact_phone", v)} type="tel" placeholder="예: 02-2588-7104" maxLength={50} />
          <Field label="필리핀 현지 전화번호" value={form.local_phone} onChange={(v) => setField("local_phone", v)} type="tel" placeholder="예: +63-32-416-1227" maxLength={50} />
          <div className="md:col-span-2">
            <Field label="필리핀 캠퍼스 주소" value={form.address} onChange={(v) => setField("address", v)} placeholder="예: SYA Campus, A.S. Fortuna St, Banilad, Mandaue City, Cebu, Philippines" maxLength={300} />
          </div>
          <div className="md:col-span-2">
            <Field label="필리핀 사무소 주소" value={form.philippines_office_address} onChange={(v) => setField("philippines_office_address", v)} placeholder="예: Gov. M. Cuenco Ave, Kasambagan, Cebu City 6000, Philippines (The Noble Cebu)" maxLength={300} />
          </div>
          <div className="md:col-span-2">
            <Field label="한국 사무소 주소" value={form.korea_office_address} onChange={(v) => setField("korea_office_address", v)} placeholder="예: 서울특별시 서초구 강남대로 381 두산베어스텔 1204호" maxLength={300} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="font-bold text-slate-900">운영 기본설정</h2>
          <p className="mt-1 text-xs text-slate-500">신규 수강등록 및 수납 화면에서 사용할 기본값입니다. 기존 등록 데이터에는 영향을 주지 않습니다.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="기본 통화" value={form.default_currency} onChange={(v) => setField("default_currency", v.toUpperCase())} maxLength={3} />
          <SelectField label="기본 결제수단" value={form.default_payment_method} options={paymentMethods} onChange={(v) => setField("default_payment_method", v)} />
          <SelectField label="기본 수강 상태" value={form.default_enrollment_status} options={enrollmentStatuses} onChange={(v) => setField("default_enrollment_status", v)} />
        </div>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6">
        <h2 className="font-bold text-slate-900">환불 정책</h2>
        <p className="mt-1 text-xs leading-5 text-slate-600">환불률은 이 화면에서 임의로 변경하지 않습니다. 홈페이지와 관리자 환불 계산은 현재 확정한 SYA 환불 기준을 사용합니다.</p>
        <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-4">
          <Policy label="25% 이내" value="잔여금액 70%" />
          <Policy label="50% 이내" value="잔여금액 50%" />
          <Policy label="75% 이내" value="잔여금액 30%" />
          <Policy label="75% 초과" value="환불 불가" />
        </div>
        <p className="mt-3 text-xs font-medium text-amber-800">실제 환불 가능액은 정책상 금액과 실제 완료 수납액(기존 환불 차감) 중 작은 금액을 기준으로 합니다.</p>
      </section>

      {(message || error) && (
        <div className={`rounded-lg px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}</div>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
          {saving ? "저장 중..." : "설정 저장"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required, maxLength }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean; maxLength?: number }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}{required && <span className="ml-1 text-red-500">*</span>}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} maxLength={maxLength} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200">
        {options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </label>
  );
}

function Policy({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-amber-200 bg-white/70 p-3"><div className="text-xs font-semibold text-slate-500">{label}</div><div className="mt-1 font-bold text-slate-900">{value}</div></div>;
}
