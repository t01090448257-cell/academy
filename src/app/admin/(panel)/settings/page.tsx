import AdminSettingsForm from "@/components/admin/settings/AdminSettingsForm";

export const metadata = {
  title: "관리자 설정 | SYA Academy Administration",
};

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Settings</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">관리자 설정</h1>
        <p className="mt-2 text-sm text-slate-500">학원 기본정보와 운영에 사용하는 기본값을 관리합니다.</p>
      </div>
      <AdminSettingsForm />
    </div>
  );
}
