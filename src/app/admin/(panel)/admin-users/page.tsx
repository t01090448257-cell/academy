import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/adminPermissions";
import AdminUsersManager from "@/components/admin/adminUsers/AdminUsersManager";

export const metadata = { title: "관리자 계정 관리 | SYA Academy Administration" };

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sya_admin_session")?.value;
  if (!token) redirect("/admin/login");

  const session = await verifySession(token);
  if (!session) redirect("/admin/login");

  const admin = await getCurrentAdmin(session.id);
  if (!admin || !admin.is_active || admin.roles.code !== "SUPER_ADMIN") redirect("/admin");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">ADMIN ACCOUNTS</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">관리자 계정 관리</h1>
        <p className="mt-2 text-sm text-slate-500">관리자 계정, 권한, 활성 상태와 비밀번호를 관리합니다.</p>
      </div>
      <AdminUsersManager currentAdminId={session.id} />
    </div>
  );
}
