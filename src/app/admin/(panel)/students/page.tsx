// /admin/students 학생 관리 — 학생 목록 (조회 전용)
// 로그인 확인은 상위 레이아웃((panel)/layout.tsx)과 proxy.ts, 그리고 /api/students에서 처리합니다.

import { Suspense } from "react";
import StudentList from "@/components/admin/students/StudentList";

export const metadata = {
  title: "학생 관리 | SYA Academy Administration",
};

export default function AdminStudentsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">불러오는 중...</p>}>
      <StudentList />
    </Suspense>
  );
}
