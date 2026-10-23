// /admin/consultations/new 상담 등록
// 학생 상세의 「상담 등록」에서 오면 ?studentId=학생ID 로 학생이 미리 선택됩니다.
// 로그인 확인은 상위 레이아웃((panel)/layout.tsx)과 proxy.ts, 저장 API(POST /api/consultations)에서 처리합니다.

import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getConsultationFormOptions } from "@/lib/consultationOptions";
import ConsultationForm from "@/components/admin/consultations/ConsultationForm";

export const metadata = {
  title: "상담 등록 | SYA Academy Administration",
};

// 담당자·상담 유형 선택지를 매 요청마다 DB에서 읽음
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ studentId?: string }>;
}

export default async function AdminConsultationNewPage({ searchParams }: PageProps) {
  const { studentId } = await searchParams;
  const token = (await cookies()).get("sya_admin_session")?.value;
  const session = token ? await verifySession(token) : null;
  const { admins, typeOptions } = await getConsultationFormOptions();

  return (
    <ConsultationForm
      mode="create"
      initialStudentId={studentId && /^\d{1,18}$/.test(studentId) ? studentId : undefined}
      admins={admins}
      currentAdminId={session?.id ?? null}
      typeOptions={typeOptions}
    />
  );
}
