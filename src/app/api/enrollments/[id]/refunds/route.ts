import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAdminSessionFromRequest,
  adminUnauthorizedResponse,
} from "@/lib/adminApiAuth";
import { requirePaymentPermission } from "@/lib/adminPermissions";
import { validateRefundInput } from "@/lib/paymentValidation";
import { Prisma } from "@/generated/prisma/client";
import { serializePaymentData } from "@/lib/paymentRecords";
import { calculateRefundPolicy } from "@/lib/refundPolicy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await getAdminSessionFromRequest(request);

  if (!s) return adminUnauthorizedResponse();

  if (!s.id) {
    return adminUnauthorizedResponse();
  }

  const adminId = BigInt(s.id);

  const p = await requirePaymentPermission(s.id, "manage");

  if (!p.ok) {
    return NextResponse.json(
      { success: false, message: "환불 권한이 없습니다." },
      { status: 403 }
    );
  }

  const raw = (await params).id;

  if (!/^\d{1,18}$/.test(raw)) {
    return NextResponse.json(
      { success: false, message: "올바른 등록 ID가 아닙니다." },
      { status: 400 }
    );
  }

  const id = BigInt(raw);

  let body: any;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "요청 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const { errors, data } = validateRefundInput(body);

  if (Object.keys(errors).length) {
    return NextResponse.json(
      {
        success: false,
        message: Object.values(errors)[0],
        errors,
      },
      { status: 400 }
    );
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const e = await tx.enrollments.findUnique({
        where: { id },
        include: {
          program_options: { select: { duration_weeks: true } },
          payments: {
            where: { status: "completed" },
            select: {
              id: true,
              amount: true,
            },
          },
          refunds: {
            where: { status: "completed" },
            select: { refund_amount: true },
          },
          accommodation_bookings: {
            select: { accommodation_amount: true, nights: true },
          },
        },
      });

      if (!e) throw new Error("NOT_FOUND");

      const paid = e.payments.reduce(
        (n, p) => n.plus(p.amount),
        new Prisma.Decimal(0)
      );

      const refunded = e.refunds.reduce(
        (n, r) => n.plus(r.refund_amount),
        new Prisma.Decimal(0)
      );

      const available = paid.minus(refunded);
      const amount = new Prisma.Decimal(String(data.refund_amount));
      const accommodationAmount = e.accommodation_bookings.reduce((sum, b) => sum.plus(b.accommodation_amount), new Prisma.Decimal(0));
      const accommodationNights = e.accommodation_bookings.reduce((sum, b) => sum + b.nights, 0);
      const policy = calculateRefundPolicy({ finalAmount: e.final_amount, paidAmount: paid, refundedAmount: refunded, startDate: e.start_date, endDate: e.end_date, durationWeeks: e.program_options?.duration_weeks ?? null, accommodationAmount, accommodationNights });
      const policyRemaining = policy.refundableAmount;

      if (amount.gt(available)) throw new Error("EXCEEDS");
      if (amount.gt(policyRemaining) || policy.refundableAmount.lte(0)) throw new Error("POLICY_EXCEEDS");

      const paymentId = data.payment_id
        ? BigInt(data.payment_id)
        : null;

      if (paymentId !== null) {
        const payment = e.payments.find(
          (x) => x.id === paymentId
        );

        if (!payment) {
          throw new Error("PAYMENT_NOT_FOUND");
        }
      }

      const row = await tx.refunds.create({
        data: {
          enrollment_id: id,
          payment_id: paymentId,
          refund_amount: amount,
          refund_reason: data.refund_reason,
          refund_method: data.refund_method,
          status: "requested",
          memo: data.memo,
          processed_by_admin_id: adminId,
        },
      });

      await tx.admin_logs.create({
        data: {
          admin_user_id: adminId,
          action: "CREATE",
          table_name: "refunds",
          record_id: row.id,
          new_data: {
            enrollment_id: id.toString(),
            refund_amount: amount.toString(),
            status: "requested",
          },
        },
      });

      return row;
    });

    return NextResponse.json(
      {
        success: true,
        refund: serializePaymentData(created),
      },
      { status: 201 }
    );
  } catch (e: any) {
    const msg =
      e.message === "NOT_FOUND"
        ? "등록 기록을 찾을 수 없습니다."
        : e.message === "PAYMENT_NOT_FOUND"
          ? "결제 기록을 찾을 수 없습니다."
          : e.message === "EXCEEDS"
            ? "현재까지 실제 수납된 금액을 초과하여 환불할 수 없습니다."
            : e.message === "POLICY_EXCEEDS"
              ? "현재 SYA 환불 규정상 환불 가능 금액을 초과했습니다."
              : "환불 등록에 실패했습니다.";

    return NextResponse.json(
      {
        success: false,
        message: msg,
      },
      {
        status:
          e.message === "NOT_FOUND" || e.message === "PAYMENT_NOT_FOUND"
            ? 404
            : 400,
      }
    );
  }
}
