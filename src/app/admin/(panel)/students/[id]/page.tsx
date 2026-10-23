// /admin/students/[id] 학생 상세 (수정은 /admin/students/[id]/edit)
// 로그인 확인은 상위 레이아웃((panel)/layout.tsx)과 proxy.ts, 그리고 /api/students/[id]에서 처리합니다.

import StudentDetail from "@/components/admin/students/StudentDetail";

export const metadata = {
  title: "학생 상세 | SYA Academy Administration",
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string }>;
}

export default async function AdminStudentDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { created, updated } = await searchParams;
  // 등록 직후(?created=1)에는 자동 발급된 학생번호 안내, 수정 직후(?updated=1)에는 수정 완료 안내를 함께 표시
  return <StudentDetail id={id} justCreated={created === "1"} justUpdated={updated === "1"} />;
}
