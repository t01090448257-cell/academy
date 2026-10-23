import { Prisma } from "@/generated/prisma/client";

export type PaymentSummary = {
  finalAmount: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  refundedAmount: Prisma.Decimal;
  outstandingAmount: Prisma.Decimal;
  status: "unpaid" | "partial" | "paid" | "overpaid" | "partially_refunded" | "fully_refunded";
};

export function calculatePaymentSummary(
  finalAmount: Prisma.Decimal,
  payments: Array<{ amount: Prisma.Decimal; status: string }>,
  refunds: Array<{ refund_amount: Prisma.Decimal; status: string }>
): PaymentSummary {
  const paidAmount = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));
  const refundedAmount = refunds
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum.plus(r.refund_amount), new Prisma.Decimal(0));
  const outstandingAmount = finalAmount.minus(paidAmount).plus(refundedAmount);
  let status: PaymentSummary["status"];
  if (refundedAmount.gt(0) && refundedAmount.gte(paidAmount)) status = "fully_refunded";
  else if (refundedAmount.gt(0)) status = "partially_refunded";
  else if (paidAmount.eq(0)) status = "unpaid";
  else if (paidAmount.lt(finalAmount)) status = "partial";
  else if (paidAmount.eq(finalAmount)) status = "paid";
  else status = "overpaid";
  return { finalAmount, paidAmount, refundedAmount, outstandingAmount, status };
}

export const PAYMENT_METHODS = [
  { value: "cash", label: "현금" },
  { value: "bank_transfer", label: "계좌이체" },
  { value: "card", label: "카드" },
  { value: "other", label: "기타" },
] as const;

export const PAYMENT_STATUSES = [
  { value: "pending", label: "대기" },
  { value: "completed", label: "완료" },
  { value: "cancelled", label: "취소" },
] as const;

export const REFUND_METHODS = [
  { value: "cash", label: "현금" },
  { value: "bank_transfer", label: "계좌이체" },
  { value: "card_reversal", label: "카드취소" },
  { value: "other", label: "기타" },
] as const;

export const REFUND_STATUSES = [
  { value: "requested", label: "요청" },
  { value: "completed", label: "완료" },
  { value: "cancelled", label: "취소" },
] as const;
