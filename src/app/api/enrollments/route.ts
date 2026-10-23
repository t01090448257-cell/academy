import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSessionFromRequest, adminUnauthorizedResponse } from "@/lib/adminApiAuth";
import { requirePaymentPermission } from "@/lib/adminPermissions";
import { validateEnrollmentInput } from "@/lib/enrollmentValidation";
import { nextEnrollmentNumber } from "@/lib/enrollmentNumber";
import { calculatePaymentSummary } from "@/lib/paymentCalc";
import { Prisma } from "@/generated/prisma/client";
import { serializePaymentData, toDateOnly, decimal } from "@/lib/paymentRecords";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) return adminUnauthorizedResponse();
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  try {
    const rows = await prisma.enrollments.findMany({
      where: q ? { OR: [
        { enrollment_no: { contains: q, mode: "insensitive" } },
        { students: { name: { contains: q, mode: "insensitive" } } },
        { students: { name_en: { contains: q, mode: "insensitive" } } },
        { students: { student_no: { contains: q, mode: "insensitive" } } },
      ] } : undefined,
      include: { students: true, programs: true, program_options: true, assigned_admin: { select: { id:true, name:true } }, payments: true, refunds: true },
      orderBy: { id: "desc" },
    });
    const enrollments = rows.map(r => ({ ...r, summary: calculatePaymentSummary(r.final_amount, r.payments, r.refunds) }));
    return NextResponse.json({ success:true, enrollments: serializePaymentData(enrollments), count: enrollments.length });
  } catch (e) {
    console.error(e); return NextResponse.json({success:false,message:"?섍컯 ?깅줉 紐⑸줉??遺덈윭?ㅼ? 紐삵뻽?듬땲??"},{status:500});
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) return adminUnauthorizedResponse();
  const perm = await requirePaymentPermission(session.id, "write");
  if (!perm.ok) return NextResponse.json({success:false,message:"?깅줉 沅뚰븳???놁뒿?덈떎."},{status:403});
  let body:any; try { body=await request.json(); } catch { return NextResponse.json({success:false,message:"?붿껌 ?뺤떇???щ컮瑜댁? ?딆뒿?덈떎."},{status:400}); }
  const {errors,data}=validateEnrollmentInput(body ?? {});
  if(Object.keys(errors).length) return NextResponse.json({success:false,message:Object.values(errors)[0],errors},{status:400});
  try {
    const created=await prisma.$transaction(async tx=>{
      const student=await tx.students.findUnique({where:{id:BigInt(data.student_id)},select:{id:true}});
      if(!student) throw new Error("STUDENT_NOT_FOUND");
      if(data.program_id) { const p=await tx.programs.findUnique({where:{id:BigInt(data.program_id)},select:{id:true,is_active:true}}); if(!p||!p.is_active) throw new Error("PROGRAM_NOT_FOUND"); }
      if(data.program_option_id) { const o=await tx.program_options.findUnique({where:{id:BigInt(data.program_option_id)},select:{id:true,program_id:true,is_active:true}}); if(!o||!o.is_active) throw new Error("OPTION_NOT_FOUND"); if(data.program_id && o.program_id!==BigInt(data.program_id)) throw new Error("OPTION_MISMATCH"); }
      const no=await nextEnrollmentNumber(tx as any);
      const final=decimal(data.base_amount).minus(decimal(data.discount_amount));
      const enrollment=await tx.enrollments.create({data:{
        enrollment_no:no,student_id:BigInt(data.student_id),program_id:data.program_id?BigInt(data.program_id):null,program_option_id:data.program_option_id?BigInt(data.program_option_id):null,
        start_date:toDateOnly(data.start_date),end_date:toDateOnly(data.end_date),enrollment_type:data.enrollment_type,status:data.status,
        base_amount:decimal(data.base_amount),discount_amount:decimal(data.discount_amount),final_amount:final,memo:data.memo,
        assigned_admin_id:data.assigned_admin_id?BigInt(data.assigned_admin_id):BigInt(session.id),
      },select:{id:true,enrollment_no:true}});
      if(body.first_payment && body.first_payment.amount !== undefined && body.first_payment.amount !== null && body.first_payment.amount !== "") {
        const rawAmount = body.first_payment.amount;
        const amountText = typeof rawAmount === "number" && Number.isSafeInteger(rawAmount)
          ? String(rawAmount)
          : typeof rawAmount === "string" ? rawAmount.trim() : "";
        if (!/^\d{1,10}$/.test(amountText) || !Number.isSafeInteger(Number(amountText)) || Number(amountText) <= 0) {
          throw new Error("PAYMENT_AMOUNT");
        }
        const amount=decimal(amountText);
        if(amount.gt(final)) throw new Error("PAYMENT_EXCEEDS");
        const method=String(body.first_payment.payment_method ?? ""); if(!["cash","bank_transfer","card","other"].includes(method)) throw new Error("PAYMENT_METHOD");
        await tx.payments.create({data:{enrollment_id:enrollment.id,amount,payment_method:method,status:"completed",payer_name:body.first_payment.payer_name?String(body.first_payment.payer_name):null,memo:body.first_payment.memo?String(body.first_payment.memo):null,received_by_admin_id:BigInt(session.id)}});
      }
      await tx.admin_logs.create({data:{admin_user_id:BigInt(session.id),action:"CREATE",table_name:"enrollments",record_id:enrollment.id,new_data:{enrollment_no:no,student_id:data.student_id,final_amount:final.toString()}}});
      return enrollment;
    });
    return NextResponse.json({success:true,enrollment:serializePaymentData(created)},{status:201});
  } catch(e:any) {
    const map:any={STUDENT_NOT_FOUND:"?숈깮??李얠쓣 ???놁뒿?덈떎.",PROGRAM_NOT_FOUND:"?꾨줈洹몃옩??李얠쓣 ???놁뒿?덈떎.",OPTION_NOT_FOUND:"湲곌컙 ?듭뀡??李얠쓣 ???놁뒿?덈떎.",OPTION_MISMATCH:"?꾨줈洹몃옩怨?湲곌컙 ?듭뀡???쇱튂?섏? ?딆뒿?덈떎.",PAYMENT_EXCEEDS:"泥?寃곗젣 湲덉븸??理쒖쥌 湲덉븸??珥덇낵?⑸땲??",PAYMENT_METHOD:"寃곗젣 諛⑸쾿???щ컮瑜댁? ?딆뒿?덈떎."};
    return NextResponse.json({success:false,message:map[e?.message]??"?섍컯 ?깅줉???ㅽ뙣?덉뒿?덈떎."},{status:e?.message?.startsWith("PAYMENT")||e?.message==="OPTION_MISMATCH"?400:500});
  }
}
