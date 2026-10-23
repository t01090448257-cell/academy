"use client";

// 관리자 영역 공통 화면 틀
// - 상단 Header: SYA Academy Administration / 로그인 관리자 정보 / 로그아웃
// - 데스크톱: 왼쪽 Sidebar + 오른쪽 Main Content
// - 모바일: 상단 메뉴 버튼으로 접고 펼치는 메뉴
//
// 관리자 정보는 기존 GET /api/auth/me, 로그아웃은 기존 POST /api/auth/logout을 그대로 사용합니다.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ADMIN_NAV_ITEMS, isAdminNavActive, type AdminNavIcon } from "@/config/adminNav";
import SessionExpiredNotice from "@/components/admin/SessionExpiredNotice";

interface AdminInfo {
  id: string;
  username: string;
  name: string;
  role: string;
}

interface AdminShellProps {
  children: ReactNode;
  /** 서버에서 확인한 세션 정보 (첫 화면 표시용, 이후 /api/auth/me 결과로 갱신) */
  initialAdmin?: AdminInfo | null;
}

/* ------------------------------------------------------------------ */
/* 아이콘 (외부 패키지 없이 인라인 SVG)                                     */
/* ------------------------------------------------------------------ */
function NavIcon({ name }: { name: AdminNavIcon }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case "students":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20c.6-3.4 3.3-5.5 6.5-5.5s5.9 2.1 6.5 5.5" />
          <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.2 2.5 3.5 5.2" />
        </svg>
      );
    case "consultations":
      return (
        <svg {...common}>
          <path d="M4 5h16v11H9l-5 4V5Z" />
          <path d="M8 9.5h8M8 12.5h5" />
        </svg>
      );
    case "programs":
      return (
        <svg {...common}>
          <path d="M3 6.5 12 3l9 3.5-9 3.5-9-3.5Z" />
          <path d="M6.5 8v5.5c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3V8" />
          <path d="M21 6.5V12" />
        </svg>
      );
    case "payments":
      return (
        <svg {...common}>
          <rect x="2.5" y="5" width="19" height="14" rx="2" />
          <path d="M2.5 9.5h19M6.5 15h4" />
        </svg>
      );
    case "adminUsers":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3 20c.5-3.2 2.6-5.2 6-5.2s5.5 2 6 5.2" />
          <path d="M17 8h4M19 6v4" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      );
  }
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

function IconMenu({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 메뉴 목록 (데스크톱 사이드바 · 모바일 메뉴 공용)                           */
/* ------------------------------------------------------------------ */
function NavList({ pathname, onNavigate, role }: { pathname: string | null; onNavigate?: () => void; role?: string | null }) {
  return (
    <ul className="space-y-1">
      {ADMIN_NAV_ITEMS.filter((item) => !item.visibleRoles || (role && item.visibleRoles.includes(role))).map((item) => {
        const active = isAdminNavActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-slate-900 font-semibold text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className={active ? "text-white" : "text-slate-400"}>
                <NavIcon name={item.icon} />
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span>{item.label}</span>
                <span className={`text-[10px] font-medium tracking-wide ${active ? "text-white/60" : "text-slate-400"}`}>
                  {item.caption}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function AdminShell({ children, initialAdmin = null }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminInfo | null>(initialAdmin);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  // /api/auth/me가 401이면 자동 이동하지 않고 안내 + [로그인] 버튼 표시
  const [sessionExpired, setSessionExpired] = useState(false);

  // 기존 GET /api/auth/me 로 로그인 관리자 정보 확인
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 401) {
          setSessionExpired(true);
          return;
        }
        const data = await response.json();
        if (!cancelled && data?.success && data.admin) {
          setAdmin(data.admin as AdminInfo);
        }
      })
      .catch((error) => {
        console.error("관리자 정보 확인 오류:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // 기존 POST /api/auth/logout 호출 후 로그인 화면으로 이동
  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok || (data && data.success === false)) {
        setLogoutError("로그아웃에 실패했습니다. 다시 시도해 주세요.");
        return;
      }
      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("로그아웃 오류:", error);
      setLogoutError("로그아웃 처리 중 오류가 발생했습니다.");
    } finally {
      setLoggingOut(false);
    }
  }

  const adminSummary = admin ? (
    <div className="min-w-0 text-right">
      <p className="truncate text-sm font-semibold text-slate-900">
        {admin.name}
        <span className="ml-1.5 font-normal text-slate-400">({admin.username})</span>
      </p>
      <p className="text-[11px] font-semibold tracking-wide text-slate-500">{admin.role}</p>
    </div>
  ) : (
    <div className="h-8 w-28 animate-pulse rounded-md bg-slate-100" aria-label="관리자 정보 불러오는 중" />
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* ── 상단 Header ── */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="관리자 메뉴 열기/닫기"
              aria-expanded={mobileOpen}
              aria-controls="admin-mobile-nav"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden"
            >
              <IconMenu open={mobileOpen} />
            </button>
            <Link href="/admin" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold tracking-widest text-white">
                SYA
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-bold text-slate-900">SYA Academy</span>
                <span className="text-[11px] font-medium tracking-wide text-slate-500">Administration</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:block">{adminSummary}</div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <IconLogout />
              <span>{loggingOut ? "로그아웃 중..." : "로그아웃"}</span>
            </button>
          </div>
        </div>
        {logoutError && (
          <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700 sm:px-6">{logoutError}</div>
        )}

        {/* ── 모바일 메뉴 (접힘/펼침) ── */}
        <nav
          id="admin-mobile-nav"
          aria-label="관리자 메뉴"
          className={`border-t border-slate-200 bg-white px-4 lg:hidden ${mobileOpen ? "block py-3" : "hidden"}`}
        >
          <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2.5 sm:hidden">
            {admin ? (
              <p className="text-sm">
                <span className="font-semibold">{admin.name}</span>
                <span className="text-slate-400"> ({admin.username})</span>
                <span className="ml-2 text-[11px] font-semibold tracking-wide text-slate-500">{admin.role}</span>
              </p>
            ) : (
              <p className="text-sm text-slate-400">관리자 정보를 불러오는 중...</p>
            )}
          </div>
          <NavList pathname={pathname} role={admin?.role} onNavigate={() => setMobileOpen(false)} />
        </nav>
      </header>

      <div className="flex">
        {/* ── 데스크톱 Sidebar ── */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4 lg:flex">
          <nav aria-label="관리자 메뉴">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Menu</p>
            <NavList pathname={pathname} role={admin?.role} />
          </nav>
          <p className="px-3 text-[11px] text-slate-400">SYA Academy · Administration</p>
        </aside>

        {/* ── Main Content ── */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {sessionExpired && (
              <div className="mb-6">
                <SessionExpiredNotice compact />
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
