// /admin/consultations/[id] 상담 상세
// 로그인 확인은 상위 레이아웃((panel)/layout.tsx)과 proxy.ts, 그리고 /api/consultations/[id]에서 처리합니다.
// 삭제 버튼은 SUPER_ADMIN에게만 보여 주고, 실제 권한 확인은 DELETE API가 DB 기준으로 다시 합니다.

import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import ConsultationDetail from "@/components/admin/consultations/ConsultationDetail";

export const metadata = {
  title: "상담 상세 | SYA Academy Administration",
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string }>;
}

export default async function AdminConsultationDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { created, updated } = await searchParams;
  const token = (await cookies()).get("sya_admin_session")?.value;
  const session = token ? await verifySession(token) : null;

  return (
    <ConsultationDetail
      id={id}
      canDelete={session?.role === "SUPER_ADMIN"}
      justCreated={created === "1"}
      justUpdated={updated === "1"}
    />
  );
}
