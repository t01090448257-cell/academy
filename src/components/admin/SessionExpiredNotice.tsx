"use client";

// 관리자 화면에서 API가 401(로그인 필요)을 돌려줬을 때 보여주는 안내
// API는 계속 JSON 401만 돌려주고, 화면이 이 안내와 [로그인] 버튼을 표시합니다.
// [로그인]은 지금 보던 주소(검색 조건 포함)를 returnUrl로 붙여 /admin/login으로 이동합니다.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import { buildAdminLoginUrl } from "@/lib/adminReturnUrl";

export const SESSION_EXPIRED_MESSAGE = "로그인이 만료되었습니다. 다시 로그인해 주세요.";

export default function SessionExpiredNotice({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  // 기본 링크: 경로만 (서버 렌더링에서도 같은 값)
  const href = buildAdminLoginUrl(pathname);

  // 클릭 시에는 검색 조건(?q=...&status=...)까지 포함한 현재 주소 전체를 사용
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    const current = `${window.location.pathname}${window.location.search}`;
    window.location.assign(buildAdminLoginUrl(current));
  }

  return (
    <div
      role="alert"
      className={`flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 sm:flex-row sm:items-center sm:justify-between ${
        compact ? "px-4 py-3" : "px-5 py-5 sm:px-6"
      }`}
    >
      <p className="text-sm font-semibold text-amber-900">{SESSION_EXPIRED_MESSAGE}</p>
      <Link
        href={href}
        onClick={handleClick}
        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        로그인
      </Link>
    </div>
  );
}
