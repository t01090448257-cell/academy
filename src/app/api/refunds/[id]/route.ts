import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAdminSessionFromRequest,
  adminUnauthorizedResponse,
} from "@/lib/adminApiAuth";
import { requirePaymentPermission } from "@/lib/adminPermissions";
import { Prisma } from "@/generated/prisma/client";
import { serializePaymentData } from "@/lib/paymentRecords";
import { calculateRefundPolicy } from "@/lib/refundPolicy";

const STATUSES = ["requested", "completed", "cancelled"] as const;
type RefundStatus = (typeof STATUSES)[number];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await getAdminSessionFromRequest(request);
  if (!s) return adminUnauthorizedResponse();

  const p = await requirePaymentPermission(s.id, "manage");
  if (!p.ok) {
    return NextResponse.json(
      { success: false, message: "환불 처리 권한이 없습니다." },
      { status: 403 }
    );
  }

  const raw = (await params).id;
  if (!/^\d{1,18}$/.test(raw)) {
    return NextResponse.json(
      { success: false, message: "올바른 환불 ID가 아닙니다." },
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

  const status = String(body.status ?? "") as RefundStatus;
  if (!STATUSES.includes(status)) {
    return NextResponse.json(
      { success: false, message: "환불 상태가 올바르지 않습니다." },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.refunds.findUnique({
        where: { id },
        include: {
          enrollments: {
            select: {
              id: true,
              final_amount: true,
              program_options: { select: { duration_weeks: true } },
              payments: {
                where: { status: "completed" },
                select: { amount: true },
              },
              refunds: {
                where: { status: "completed" },
                select: { id: true, refund_amount: true },
              },
              accommodation_bookings: {
                select: { accommodation_amount: true, nights: true },
              },
              start_date: true,
              end_date: true,
            },
          },
        },
      });

      if (!before) throw new Error("NOT_FOUND");

      if (before.status === status) {
        return before;
      }

      if (before.status !== "requested") {
        throw new Error("INVALID_TRANSITION");
      }

      if (status === "completed") {
        const paid = before.enrollments.payments.reduce(
          (sum, payment) => sum.plus(payment.amount),
          new Prisma.Decimal(0)
        );
        const completedRefunded = before.enrollments.refunds
          .filter((refund) => refund.id !== before.id)
          .reduce(
            (sum, refund) => sum.plus(refund.refund_amount),
            new Prisma.Decimal(0)
          );
        const available = paid.minus(completedRefunded);

        if (before.refund_amount.gt(available)) {
          throw new Error("EXCEEDS");
        }

        const accommodationAmount = before.enrollments.accommodation_bookings.reduce((sum, b) => sum.plus(b.accommodation_amount), new Prisma.Decimal(0));
        const accommodationNights = before.enrollments.accommodation_bookings.reduce((sum, b) => sum + b.nights, 0);
        const policy = calculateRefundPolicy({
          finalAmount: before.enrollments.final_amount,
          paidAmount: paid,
          refundedAmount: completedRefunded,
          startDate: before.enrollments.start_date,
          endDate: before.enrollments.end_date,
          durationWeeks: before.enrollments.program_options?.duration_weeks ?? null,
          requestDate: before.refund_date,
          accommodationAmount,
          accommodationNights,
        });
        if (before.refund_amount.gt(policy.refundableAmount) || policy.refundableAmount.lte(0)) {
          throw new Error("POLICY_EXCEEDS");
        }
      }

      const row = await tx.refunds.update({
        where: { id },
        data: {
          status,
          processed_by_admin_id: BigInt(s.id),
          updated_at: new Date(),
        },
      });

      await tx.admin_logs.create({
        data: {
          admin_user_id: BigInt(s.id),
          action: "UPDATE",
          table_name: "refunds",
          record_id: id,
          old_data: { status: before.status },
          new_data: { status },
        },
      });

      return row;
    });

    return NextResponse.json({
      success: true,
      refund: serializePaymentData(result),
    });
  } catch (e: any) {
    const message =
      e.message === "NOT_FOUND"
        ? "환불 기록을 찾을 수 없습니다."
        : e.message === "INVALID_TRANSITION"
          ? "이미 처리된 환불은 상태를 다시 변경할 수 없습니다."
          : e.message === "EXCEEDS"
            ? "현재까지 수납된 금액을 초과하여 환불할 수 없습니다."
            : e.message === "POLICY_EXCEEDS"
              ? "SYA 환불 규정상 실제 납부액 기준 환불 가능 금액을 초과하여 완료 처리할 수 없습니다."
              : "환불 상태 변경에 실패했습니다.";

    return NextResponse.json(
      { success: false, message },
      { status: e.message === "NOT_FOUND" ? 404 : 400 }
    );
  }
}
