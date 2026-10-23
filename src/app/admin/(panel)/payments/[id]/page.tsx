import EnrollmentDetail from "@/components/admin/payments/EnrollmentDetail";
export const metadata={title:"수납 상세 | SYA Academy Administration"};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <EnrollmentDetail id={id}/> }
