// /admin/programs 프로그램·가격 관리
// 로그인 확인은 상위 레이아웃((panel)/layout.tsx)과 proxy.ts, 그리고 /api/programs에서 처리합니다.
// 가격 등록·수정 권한(SUPER_ADMIN, ADMIN)은 API가 DB 기준으로 확인하고, 화면은 그 결과(canManage)에 맞춰 버튼을 표시합니다.

import ProgramPriceManager from "@/components/admin/programs/ProgramPriceManager";

export const metadata = {
  title: "프로그램 관리 | SYA Academy Administration",
};

export default function AdminProgramsPage() {
  return <ProgramPriceManager />;
}
