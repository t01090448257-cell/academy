// 관리자 대시보드 (/admin)
// 기존 src/app/admin/page.tsx의 관리자 정보 표시를 그대로 옮기고, 메뉴 바로가기만 추가했습니다.
// 로그인 확인은 상위 레이아웃((panel)/layout.tsx)과 proxy.ts에서 처리합니다.

import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { ADMIN_NAV_ITEMS } from "@/config/adminNav";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sya_admin_session")?.value;

  if (!token) {
    redirect("/admin/login");
  }

  const session = await verifySession(token);

  if (!session) {
    redirect("/admin/login");
  }

  // 좌측 메뉴(AdminShell)와 같은 기준으로 표시: 권한 제한 메뉴(관리자 계정 = SUPER_ADMIN)는 해당 권한일 때만
  const shortcuts = ADMIN_NAV_ITEMS.filter(
    (item) => item.href !== "/admin" && (!item.visibleRoles || item.visibleRoles.includes(session.role))
  );

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        SYA Academy Administration
      </p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">관리자 대시보드</h1>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow sm:p-8">
        <h2 className="text-sm font-semibold text-slate-500">로그인 정보</h2>
        <dl className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">아이디</dt>
            <dd className="mt-1 font-semibold text-slate-900">{session.username}</dd>
          </div>
          <div>
            <dt className="text-slate-500">이름</dt>
            <dd className="mt-1 font-semibold text-slate-900">{session.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">권한</dt>
            <dd className="mt-1 font-semibold text-slate-900">{session.role}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-2xl bg-white p-5 shadow transition hover:shadow-md"
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{item.caption}</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{item.label}</p>
            {/* 6개 메뉴 모두 화면·API·로그인 확인이 구현되어 있어 "준비중" 대신 바로가기로 표시 (2026-10-22 확인) */}
            <p className="mt-3 text-xs text-slate-500">
              바로가기 <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
