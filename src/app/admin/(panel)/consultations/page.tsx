// /admin/consultations 상담 목록
// 로그인 확인은 상위 레이아웃((panel)/layout.tsx)과 proxy.ts, 그리고 /api/consultations에서 처리합니다.

import { Suspense } from "react";
import ConsultationList from "@/components/admin/consultations/ConsultationList";

export const metadata = {
  title: "상담/문의 관리 | SYA Academy Administration",
};

interface PageProps {
  searchParams: Promise<{ deleted?: string }>;
}

export default async function AdminConsultationsPage({ searchParams }: PageProps) {
  const { deleted } = await searchParams;
  // useSearchParams(검색 조건)를 사용하는 화면이므로 Suspense로 감쌈
  return (
    <Suspense>
      <ConsultationList justDeleted={deleted === "1"} />
    </Suspense>
  );
}
