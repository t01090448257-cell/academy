// 관리자 영역 공통 레이아웃 (/admin, /admin/students 등)
// (panel)은 URL에 나타나지 않는 폴더 이름입니다. /admin/login은 이 레이아웃 밖에 있어 그대로 유지됩니다.
//
// 인증 확인은 기존 방식 그대로 사용합니다:
// proxy.ts에서 1차로 확인하고, 여기서 기존 sya_admin_session 쿠키 + verifySession으로 한 번 더 확인합니다.

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";

export const metadata = {
  title: "SYA Academy Administration",
};

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("sya_admin_session")?.value;

  if (!token) {
    redirect("/admin/login");
  }

  const session = await verifySession(token);

  if (!session) {
    redirect("/admin/login");
  }

  return <AdminShell initialAdmin={session}>{children}</AdminShell>;
}
