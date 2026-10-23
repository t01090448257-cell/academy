import {NextResponse,type NextRequest} from "next/server";
import {prisma} from "@/lib/prisma";
import {getAdminSessionFromRequest,adminUnauthorizedResponse} from "@/lib/adminApiAuth";
import {requirePaymentPermission} from "@/lib/adminPermissions";
import {calculatePaymentSummary} from "@/lib/paymentCalc";
import {validatePaymentInput} from "@/lib/paymentValidation";
import {Prisma} from "@/generated/prisma/client";
import {serializePaymentData} from "@/lib/paymentRecords";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const s=await getAdminSessionFromRequest(request);if(!s)return adminUnauthorizedResponse();
 const p=await requirePaymentPermission(s.id,"write");if(!p.ok)return NextResponse.json({success:false,message:"수납 권한이 없습니다."},{status:403});
 const raw=(await params).id;if(!/^\d{1,18}$/.test(raw))return NextResponse.json({success:false,message:"올바른 등록 ID가 아닙니다."},{status:400});const id=BigInt(raw);
 let body:any;try{body=await request.json()}catch{return NextResponse.json({success:false,message:"요청 형식이 올바르지 않습니다."},{status:400})}
 const {errors,data}=validatePaymentInput(body);if(Object.keys(errors).length)return NextResponse.json({success:false,message:Object.values(errors)[0],errors},{status:400});
 try{
  const created=await prisma.$transaction(async tx=>{
   const enrollment=await tx.enrollments.findUnique({where:{id},include:{payments:{select:{amount:true,status:true}},refunds:{select:{refund_amount:true,status:true}}}});
   if(!enrollment)throw new Error("NOT_FOUND");
   const summary=calculatePaymentSummary(enrollment.final_amount,enrollment.payments,enrollment.refunds);
   if(summary.outstandingAmount.lte(0))throw new Error("NO_DUE");
   const amount=new Prisma.Decimal(String(data.amount));
   if(amount.gt(summary.outstandingAmount))throw new Error("EXCEEDS");
   const pay=await tx.payments.create({data:{enrollment_id:id,amount,payment_method:data.payment_method,status:"completed",payment_date:data.payment_date?new Date(data.payment_date+"T00:00:00.000Z"):new Date(),payer_name:data.payer_name,transaction_id:data.transaction_id,memo:data.memo,received_by_admin_id:BigInt(s.id)}});
   await tx.admin_logs.create({data:{admin_user_id:BigInt(s.id),action:"CREATE",table_name:"payments",record_id:pay.id,new_data:{enrollment_id:id.toString(),amount:amount.toString(),payment_method:data.payment_method}}});
   return pay;
  });return NextResponse.json({success:true,payment:serializePaymentData(created)},{status:201});
 }catch(e:any){const msg=e.message==="NOT_FOUND"?"등록 기록을 찾을 수 없습니다.":e.message==="NO_DUE"?"미수금이 없습니다.":e.message==="EXCEEDS"?"미수금을 초과하는 금액은 수납할 수 없습니다.":"수납 등록에 실패했습니다.";return NextResponse.json({success:false,message:msg},{status:e.message==="NOT_FOUND"?404:400})}
}
