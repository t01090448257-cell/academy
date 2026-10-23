import EnrollmentList from "@/components/admin/payments/EnrollmentList";
export const metadata={title:"수납/결제 관리 | SYA Academy Administration"};
export default function AdminPaymentsPage(){return <section><div className="flex items-end justify-between"><div><p className="text-sm text-slate-500">Payments</p><h1 className="mt-1 text-2xl font-bold text-slate-900">수납/결제 관리</h1><p className="mt-1 text-sm text-slate-500">수강 등록과 결제·환불 이력을 관리합니다.</p></div></div><div className="mt-6"><EnrollmentList/></div></section>}
