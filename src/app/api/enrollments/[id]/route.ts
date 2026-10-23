import { NextResponse,type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getAdminSessionFromRequest,adminUnauthorizedResponse } from "@/lib/adminApiAuth";
import { requirePaymentPermission } from "@/lib/adminPermissions";
import { calculatePaymentSummary } from "@/lib/paymentCalc";
import { validateEnrollmentInput } from "@/lib/enrollmentValidation";
import { decimal,serializePaymentData,toDateOnly } from "@/lib/paymentRecords";
import { calculateRefundPolicy } from "@/lib/refundPolicy";

async function getId(id:string){return /^\d{1,18}$/.test(id)?BigInt(id):null;}
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const s=await getAdminSessionFromRequest(request);if(!s)return adminUnauthorizedResponse();
 const id=await getId((await params).id);if(id===null)return NextResponse.json({success:false,message:"올바른 ID가 아닙니다."},{status:400});
 const row=await prisma.enrollments.findUnique({where:{id},include:{students:true,programs:true,program_options:true,assigned_admin:{select:{id:true,name:true}},accommodation_bookings:{select:{id:true,accommodation_amount:true,nights:true,check_in_date:true,check_out_date:true,status:true}},payments:{include:{received_by_admin:{select:{id:true,name:true}},refunds:true},orderBy:{payment_date:"desc"}},refunds:{include:{processed_by_admin:{select:{id:true,name:true}},payments:{select:{id:true}}},orderBy:{refund_date:"desc"}}}});
 if(!row)return NextResponse.json({success:false,message:"등록 기록을 찾을 수 없습니다."},{status:404});
 const summary = calculatePaymentSummary(row.final_amount,row.payments,row.refunds);
 const accommodationAmount = row.accommodation_bookings.reduce((sum, b) => sum.plus(b.accommodation_amount), new Prisma.Decimal(0));
 const accommodationNights = row.accommodation_bookings.reduce((sum, b) => sum + b.nights, 0);
 const refundPolicy = calculateRefundPolicy({finalAmount:row.final_amount,paidAmount:summary.paidAmount,refundedAmount:summary.refundedAmount,startDate:row.start_date,endDate:row.end_date,durationWeeks:row.program_options?.duration_weeks ?? null,accommodationAmount,accommodationNights});
 return NextResponse.json({success:true,enrollment:serializePaymentData({...row,summary,refundPolicy})});
}
export async function PUT(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const s=await getAdminSessionFromRequest(request);if(!s)return adminUnauthorizedResponse();
 const p=await requirePaymentPermission(s.id,"manage");if(!p.ok)return NextResponse.json({success:false,message:"수정 권한이 없습니다."},{status:403});
 const id=await getId((await params).id);if(id===null)return NextResponse.json({success:false,message:"올바른 ID가 아닙니다."},{status:400});
 let body:any;try{body=await request.json()}catch{return NextResponse.json({success:false,message:"요청 형식이 올바르지 않습니다."},{status:400})}
 const {errors,data}=validateEnrollmentInput(body);if(Object.keys(errors).length)return NextResponse.json({success:false,message:Object.values(errors)[0],errors},{status:400});
 try{
  const before=await prisma.enrollments.findUnique({where:{id},select:{id:true,base_amount:true,discount_amount:true}});
  if(!before)return NextResponse.json({success:false,message:"등록 기록을 찾을 수 없습니다."},{status:404});
  const payments=await prisma.payments.findMany({where:{enrollment_id:id,status:"completed"},select:{amount:true}});
  const refunds=await prisma.refunds.findMany({where:{enrollment_id:id,status:"completed"},select:{refund_amount:true}});
  const newFinal=decimal(data.base_amount).minus(decimal(data.discount_amount));
  const summary=calculatePaymentSummary(newFinal,payments.map(x=>({...x,status:"completed"})),refunds.map(x=>({...x,status:"completed"})));
  if(summary.outstandingAmount.lt(0)) return NextResponse.json({success:false,message:"최종 금액보다 이미 받은 금액이 많아 금액을 줄일 수 없습니다."},{status:400});
  const updated=await prisma.$transaction(async tx=>{
   const row=await tx.enrollments.update({where:{id},data:{program_id:data.program_id?BigInt(data.program_id):null,program_option_id:data.program_option_id?BigInt(data.program_option_id):null,start_date:toDateOnly(data.start_date),end_date:toDateOnly(data.end_date),enrollment_type:data.enrollment_type,status:data.status,base_amount:decimal(data.base_amount),discount_amount:decimal(data.discount_amount),final_amount:newFinal,memo:data.memo,assigned_admin_id:data.assigned_admin_id?BigInt(data.assigned_admin_id):undefined,updated_at:new Date()}});
   await tx.admin_logs.create({data:{admin_user_id:BigInt(s.id),action:"UPDATE",table_name:"enrollments",record_id:id,old_data:{base_amount:before.base_amount.toString(),discount_amount:before.discount_amount.toString()},new_data:{base_amount:data.base_amount,discount_amount:data.discount_amount,final_amount:newFinal.toString()}}});
   return row;
  });return NextResponse.json({success:true,enrollment:serializePaymentData(updated)});
 }catch(e){console.error(e);return NextResponse.json({success:false,message:"등록 수정에 실패했습니다."},{status:500})}
}
export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const s=await getAdminSessionFromRequest(request);if(!s)return adminUnauthorizedResponse();
 const p=await requirePaymentPermission(s.id,"delete");if(!p.ok)return NextResponse.json({success:false,message:"삭제 권한이 없습니다."},{status:403});
 const id=await getId((await params).id);if(id===null)return NextResponse.json({success:false,message:"올바른 ID가 아닙니다."},{status:400});
 try{
  const row=await prisma.enrollments.findUnique({where:{id},include:{payments:true,refunds:true}});
  if(!row)return NextResponse.json({success:false,message:"등록 기록을 찾을 수 없습니다."},{status:404});
  if(row.payments.length||row.refunds.length)return NextResponse.json({success:false,message:"결제 또는 환불 이력이 있는 등록은 삭제할 수 없습니다. 취소 처리를 이용해 주세요."},{status:409});
  await prisma.$transaction(async tx=>{await tx.admin_logs.create({data:{admin_user_id:BigInt(s.id),action:"DELETE",table_name:"enrollments",record_id:id,old_data:{enrollment_no:row.enrollment_no,student_id:row.student_id.toString()}}});await tx.enrollments.delete({where:{id}})});
  return NextResponse.json({success:true});
 }catch(e){console.error(e);return NextResponse.json({success:false,message:"등록 삭제에 실패했습니다."},{status:500})}
}
