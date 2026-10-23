// /admin/consultations/[id]/edit 상담 수정
// 로그인 확인은 상위 레이아웃((panel)/layout.tsx)과 proxy.ts, 그리고 /api/consultations/[id](GET·PUT)에서 처리합니다.
// 상담 기록은 화면(ConsultationForm)이 GET /api/consultations/[id]로 불러오고, 잘못된 ID·없는 기록도 그 응답(400·404)으로 안내합니다.

import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getConsultationFormOptions } from "@/lib/consultationOptions";
import ConsultationForm from "@/components/admin/consultations/ConsultationForm";

export const metadata = {
  title: "상담 수정 | SYA Academy Administration",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminConsultationEditPage({ params }: PageProps) {
  const { id } = await params;
  const token = (await cookies()).get("sya_admin_session")?.value;
  const session = token ? await verifySession(token) : null;
  const { admins, typeOptions } = await getConsultationFormOptions();

  return (
    <ConsultationForm
      mode="edit"
      consultationId={id}
      admins={admins}
      currentAdminId={session?.id ?? null}
      typeOptions={typeOptions}
    />
  );
}
