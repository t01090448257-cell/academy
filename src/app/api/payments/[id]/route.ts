import {NextResponse,type NextRequest} from "next/server";
import {prisma} from "@/lib/prisma";
import {getAdminSessionFromRequest,adminUnauthorizedResponse} from "@/lib/adminApiAuth";
import {requirePaymentPermission} from "@/lib/adminPermissions";
import {serializePaymentData} from "@/lib/paymentRecords";
import {validatePaymentInput} from "@/lib/paymentValidation";
export async function PUT(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const s=await getAdminSessionFromRequest(request);if(!s)return adminUnauthorizedResponse();const p=await requirePaymentPermission(s.id,"manage");if(!p.ok)return NextResponse.json({success:false,message:"수정 권한이 없습니다."},{status:403});
 const raw=(await params).id;if(!/^\d{1,18}$/.test(raw))return NextResponse.json({success:false,message:"올바른 결제 ID가 아닙니다."},{status:400});const id=BigInt(raw);let body:any;try{body=await request.json()}catch{return NextResponse.json({success:false,message:"요청 형식이 올바르지 않습니다."},{status:400})}
 const {errors,data}=validatePaymentInput(body);if(Object.keys(errors).length)return NextResponse.json({success:false,message:Object.values(errors)[0],errors},{status:400});
 try{const before=await prisma.payments.findUnique({where:{id}});if(!before)return NextResponse.json({success:false,message:"결제 기록을 찾을 수 없습니다."},{status:404});const updated=await prisma.$transaction(async tx=>{const row=await tx.payments.update({where:{id},data:{amount:data.amount,payment_method:data.payment_method,payment_date:data.payment_date?new Date(data.payment_date+"T00:00:00.000Z"):before.payment_date,payer_name:data.payer_name,transaction_id:data.transaction_id,memo:data.memo,updated_at:new Date()}});await tx.admin_logs.create({data:{admin_user_id:BigInt(s.id),action:"UPDATE",table_name:"payments",record_id:id,old_data:{amount:before.amount.toString(),status:before.status},new_data:{amount:data.amount,status:before.status}}});return row});return NextResponse.json({success:true,payment:serializePaymentData(updated)})}catch(e){console.error(e);return NextResponse.json({success:false,message:"결제 수정에 실패했습니다."},{status:500})}
}
export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const s=await getAdminSessionFromRequest(request);if(!s)return adminUnauthorizedResponse();const p=await requirePaymentPermission(s.id,"manage");if(!p.ok)return NextResponse.json({success:false,message:"결제 취소 권한이 없습니다."},{status:403});
 const raw=(await params).id;if(!/^\d{1,18}$/.test(raw))return NextResponse.json({success:false,message:"올바른 결제 ID가 아닙니다."},{status:400});const id=BigInt(raw);
 try{const before=await prisma.payments.findUnique({where:{id}});if(!before)return NextResponse.json({success:false,message:"결제 기록을 찾을 수 없습니다."},{status:404});if(before.status==="cancelled")return NextResponse.json({success:true});const updated=await prisma.$transaction(async tx=>{const row=await tx.payments.update({where:{id},data:{status:"cancelled",updated_at:new Date()}});await tx.admin_logs.create({data:{admin_user_id:BigInt(s.id),action:"CANCEL",table_name:"payments",record_id:id,old_data:{status:before.status,amount:before.amount.toString()},new_data:{status:"cancelled"}}});return row});return NextResponse.json({success:true,payment:serializePaymentData(updated)})}catch(e){console.error(e);return NextResponse.json({success:false,message:"결제 취소에 실패했습니다."},{status:500})}
}
