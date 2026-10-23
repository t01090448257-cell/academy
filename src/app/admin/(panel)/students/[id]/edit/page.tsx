// /admin/students/[id]/edit 학생 수정
// 로그인 확인은 상위 레이아웃((panel)/layout.tsx)과 proxy.ts, 그리고 /api/students/[id](GET·PUT)에서 처리합니다.
// 학생 정보는 화면(StudentEditForm)이 GET /api/students/[id]로 불러오고, 잘못된 ID·없는 학생도 그 응답(400·404)으로 안내합니다.

import { prisma } from "@/lib/prisma";
import { DEFAULT_STUDENT_STATUS } from "@/lib/studentValidation";
import StudentEditForm from "@/components/admin/students/StudentEditForm";

export const metadata = {
  title: "학생 수정 | SYA Academy Administration",
};

// 매 요청마다 DB의 최신 상태값을 읽도록 정적 생성하지 않음
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminStudentEditPage({ params }: PageProps) {
  const { id } = await params;

  // 상태 선택지: 학생 등록 화면과 같은 규칙 — schema 기본값(active) + 현재 DB에서 실제 사용 중인 상태값
  const rows = await prisma.students.findMany({
    distinct: ["status"],
    select: { status: true },
    orderBy: { status: "asc" },
  });
  const statusOptions = Array.from(
    new Set([DEFAULT_STUDENT_STATUS, ...rows.map((row: { status: string }) => row.status)])
  );

  return <StudentEditForm id={id} statusOptions={statusOptions} />;
}
