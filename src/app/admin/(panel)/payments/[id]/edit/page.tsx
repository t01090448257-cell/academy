import Link from "next/link";
import EnrollmentEditForm from "@/components/admin/payments/EnrollmentEditForm";

export const metadata = { title: "수강 정보 수정 | SYA Academy Administration" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section>
      <Link href={`/admin/payments/${id}`} className="text-sm text-slate-500">← 상세로</Link>
      <h1 className="mt-4 text-2xl font-bold">수강 정보 수정</h1>
      <p className="mt-2 text-sm text-slate-500">프로그램, 기간, 수강료, 할인, 일정, 등록 상태와 메모를 수정합니다.</p>
      <div className="mt-6"><EnrollmentEditForm enrollmentId={id} /></div>
    </section>
  );
}
