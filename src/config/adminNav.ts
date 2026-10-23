// src/config/adminNav.ts
// 관리자 영역(/admin) 좌측 메뉴 구성. 메뉴를 추가할 때는 이 배열과 해당 페이지만 추가하면 됩니다.

export type AdminNavIcon =
  | "dashboard"
  | "students"
  | "consultations"
  | "programs"
  | "payments"
  | "settings"
  | "adminUsers";

export interface AdminNavItem {
  href: string;
  label: string;
  /** 메뉴 아래 작은 영문 표기 */
  caption: string;
  icon: AdminNavIcon;
  visibleRoles?: readonly string[];
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "대시보드", caption: "Dashboard", icon: "dashboard" },
  { href: "/admin/students", label: "학생 관리", caption: "Students", icon: "students" },
  { href: "/admin/consultations", label: "상담/문의 관리", caption: "Consultations", icon: "consultations" },
  { href: "/admin/programs", label: "프로그램 관리", caption: "Programs", icon: "programs" },
  { href: "/admin/payments", label: "수납/결제 관리", caption: "Payments", icon: "payments" },
  { href: "/admin/settings", label: "관리자 설정", caption: "Settings", icon: "settings" },
  { href: "/admin/admin-users", label: "관리자 계정", caption: "Admin Accounts", icon: "adminUsers", visibleRoles: ["SUPER_ADMIN"] },
];

/** 현재 경로가 메뉴에 해당하는지 (대시보드는 /admin 정확히 일치할 때만) */
export function isAdminNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
