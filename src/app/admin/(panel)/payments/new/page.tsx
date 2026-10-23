import EnrollmentForm from "@/components/admin/payments/EnrollmentForm";
export const metadata={title:"수납 등록 | SYA Academy Administration"};
export default async function Page({searchParams}:{searchParams:Promise<{studentId?:string}>}){const p=await searchParams;return <section><h1 className="text-2xl font-bold">수강/수납 등록</h1><div className="mt-6 rounded-2xl bg-white p-6 shadow"><EnrollmentForm studentId={p.studentId}/></div></section>}
