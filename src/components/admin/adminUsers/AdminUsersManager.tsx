"use client";

import { FormEvent, useEffect, useState } from "react";

type Role = { id: string; code: string; name: string; description: string };
type AdminUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  role: { id: string; code: string; name: string };
};

type FormState = { id: string; username: string; name: string; email: string; password: string; role_code: string; is_active: boolean };
const emptyForm: FormState = { id: "", username: "", name: "", email: "", password: "", role_code: "STAFF", is_active: true };

function formatDate(value: string | null) {
  if (!value) return "없음";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function AdminUsersManager({ currentAdminId }: { currentAdminId: string }) {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin-users", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "관리자 계정을 불러오지 못했습니다.");
      setAdmins(data.admins);
      setRoles(data.roles);
      if (!editing && data.roles.length && !form.role_code) setForm((prev) => ({ ...prev, role_code: data.roles.find((r: Role) => r.code === "STAFF")?.code ?? data.roles[0].code }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "관리자 계정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function startEdit(admin: AdminUser) {
    setEditing(true);
    setMessage("");
    setError("");
    setForm({ id: admin.id, username: admin.username, name: admin.name, email: admin.email, password: "", role_code: admin.role.code, is_active: admin.is_active });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startCreate() {
    setEditing(false);
    setMessage("");
    setError("");
    setForm({ ...emptyForm, role_code: roles.find((r) => r.code === "STAFF")?.code ?? roles[0]?.code ?? "STAFF" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin-users", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? form : { ...form, password: form.password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "저장하지 못했습니다.");
      setMessage(editing ? "관리자 계정이 수정되었습니다." : "관리자 계정이 생성되었습니다.");
      setForm(emptyForm);
      setEditing(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{editing ? "관리자 계정 수정" : "관리자 계정 추가"}</h2>
            <p className="mt-1 text-sm text-slate-500">SUPER_ADMIN만 관리자 계정을 추가·수정할 수 있습니다.</p>
          </div>
          {editing && <button type="button" onClick={startCreate} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">새 계정 추가</button>}
        </div>

        <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">아이디 *</span><input value={form.username} disabled={editing || saving} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-3 disabled:bg-slate-50" placeholder="admin01" /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">이름 *</span><input value={form.name} disabled={saving} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-3" placeholder="관리자 이름" /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">이메일</span><input type="email" value={form.email} disabled={saving} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-3" placeholder="admin@syaacademy.com" /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">권한 *</span><select value={form.role_code} disabled={saving} onChange={(e) => setForm({ ...form, role_code: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3">{roles.map((role) => <option key={role.id} value={role.code}>{role.name} ({role.code})</option>)}</select></label>
          <label className="block md:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-700">{editing ? "새 비밀번호 (변경할 때만 입력)" : "비밀번호 *"}</span><input type="password" value={form.password} disabled={saving} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-3" placeholder="8자 이상" autoComplete="new-password" /></label>
          {editing && <label className="flex items-center gap-3 md:col-span-2"><input type="checkbox" checked={form.is_active} disabled={saving || form.id === currentAdminId} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4" /><span className="text-sm font-semibold text-slate-700">계정 활성</span>{form.id === currentAdminId && <span className="text-xs text-slate-400">현재 로그인한 계정은 비활성화할 수 없습니다.</span>}</label>}
          <div className="md:col-span-2 flex items-center gap-3"><button disabled={saving} className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "저장 중..." : editing ? "변경 저장" : "관리자 추가"}</button>{editing && <button type="button" disabled={saving} onClick={startCreate} className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">취소</button>}</div>
        </form>
        {message && <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5"><h2 className="text-lg font-bold text-slate-900">관리자 계정 목록</h2><p className="mt-1 text-sm text-slate-500">비밀번호는 표시하지 않으며, 마지막 로그인과 활성 상태만 확인합니다.</p></div>
        {loading ? <div className="p-8 text-sm text-slate-500">불러오는 중...</div> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-6 py-3">관리자</th><th className="px-6 py-3">권한</th><th className="px-6 py-3">상태</th><th className="px-6 py-3">마지막 로그인</th><th className="px-6 py-3 text-right">관리</th></tr></thead><tbody className="divide-y divide-slate-100">{admins.map((admin) => <tr key={admin.id}><td className="px-6 py-4"><div className="font-semibold text-slate-900">{admin.name}</div><div className="text-xs text-slate-400">{admin.username}{admin.email ? ` · ${admin.email}` : ""}</div></td><td className="px-6 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{admin.role.name}</span></td><td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${admin.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{admin.is_active ? "active" : "inactive"}</span></td><td className="px-6 py-4 text-slate-500">{formatDate(admin.last_login_at)}</td><td className="px-6 py-4 text-right"><button type="button" onClick={() => startEdit(admin)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">수정</button></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
