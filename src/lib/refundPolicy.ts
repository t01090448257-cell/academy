import { Prisma } from "@/generated/prisma/client";

export type RefundPolicyResult = {
  phase: "before_departure" | "after_departure" | "no_refund" | "not_started";
  label: string;
  refundableAmount: Prisma.Decimal;
  detail: string;
  notice: string;
};

function dateOnly(value: Date | string) {
  const d = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00.000Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function diffDays(a: Date, b: Date) {
  return Math.floor((dateOnly(b).getTime() - dateOnly(a).getTime()) / 86400000);
}

function floorToFourWeeks(weeks: number) {
  return Math.floor(Math.max(0, weeks) / 4) * 4;
}

/**
 * SYA 환불 규정.
 * 실제 완료 수납액을 기준으로 환불 가능액을 계산하며, 수강+숙박이 하나의 최종금액으로 저장된 경우에는
 * 별도 숙박 금액이 없으면 전체 금액을 4주 단위로 환산해 계산합니다.
 */
export function calculateRefundPolicy(args: {
  finalAmount: Prisma.Decimal;
  /** 실제 완료 수납액. 환불 계산은 할인 후 최종금액이 아니라 실제 납부액을 기준으로 합니다. */
  paidAmount?: Prisma.Decimal;
  /** 이미 완료된 환불액. 현재 남은 환불 가능액 계산에 사용합니다. */
  refundedAmount?: Prisma.Decimal;
  startDate: Date | string | null;
  endDate: Date | string | null;
  requestDate?: Date | string;
  accommodationAmount?: Prisma.Decimal;
  accommodationNights?: number;
  durationWeeks?: number | null;
}): RefundPolicyResult {
  const zero = new Prisma.Decimal(0);
  const finalAmount = args.finalAmount.gte(zero) ? args.finalAmount : zero;
  const paidAmount = (args.paidAmount ?? finalAmount).gte(zero) ? (args.paidAmount ?? finalAmount) : zero;
  const refundedAmount = (args.refundedAmount ?? zero).gte(zero) ? (args.refundedAmount ?? zero) : zero;
  // 환불 한도는 할인 적용 후 최종금액 전체가 아니라 실제로 완료 수납된 금액을 기준으로 계산합니다.
  const paidBase = paidAmount.lt(finalAmount) ? paidAmount : finalAmount;

  if (!args.startDate || !args.endDate) {
    return {
      phase: "no_refund",
      label: "환불 기준일 계산 불가",
      refundableAmount: zero,
      detail: "시작일과 종료일이 등록되어 있어야 환불 규정을 적용할 수 있습니다.",
      notice: "환불 요청 전에 수강 시작일과 종료일을 확인해 주세요.",
    };
  }

  const start = dateOnly(args.startDate);
  const end = dateOnly(args.endDate);
  const request = args.requestDate ? dateOnly(args.requestDate) : dateOnly(new Date());
  const totalDays = Math.max(1, diffDays(start, end) + 1);
  const totalWeeks = Math.max(1, args.durationWeeks ?? Math.ceil(totalDays / 7));
  const elapsedDays = diffDays(start, request);
  const daysUntilStart = diffDays(request, start);

  const accommodationAmount = args.accommodationAmount ?? zero;
  const nights = Math.max(0, args.accommodationNights ?? 0);
  const tuitionAmount = finalAmount.minus(accommodationAmount).gte(zero)
    ? finalAmount.minus(accommodationAmount)
    : finalAmount;
  const fourWeekAccommodation = nights > 0
    ? accommodationAmount.div(nights).mul(28)
    : finalAmount.div(totalWeeks).mul(4);
  const fourWeekTuition = tuitionAmount.div(totalWeeks).mul(4);

  if (elapsedDays < 0) {
    if (daysUntilStart >= 29) {
      return {
        phase: "before_departure",
        label: "출국 4주 전까지",
        refundableAmount: paidBase.minus(refundedAmount).gte(zero) ? paidBase.minus(refundedAmount) : zero,
        detail: "실제 완료 수납액을 기준으로 환불합니다. SYA는 별도 등록비를 관리하지 않으므로 실제 납부액을 기준으로 계산합니다.",
        notice: "출국 4주 전까지 취소 신청",
      };
    }

    if (daysUntilStart >= 15) {
      const amount = paidBase.minus(fourWeekAccommodation.div(2)).minus(refundedAmount);
      const safeAmount = amount.gte(zero) ? amount : zero;
      return {
        phase: "before_departure",
        label: "출국 2주 전까지",
        refundableAmount: safeAmount,
        detail: "2주분 숙박비를 제외한 잔여 금액을 환불합니다.",
        notice: "출국 15~28일 전 취소 신청",
      };
    }

    if (daysUntilStart >= 4) {
      const amount = paidBase.minus(fourWeekAccommodation).minus(refundedAmount);
      const safeAmount = amount.gte(zero) ? amount : zero;
      return {
        phase: "before_departure",
        label: "출국 1주 전까지",
        refundableAmount: safeAmount,
        detail: "4주분 숙박비를 제외한 잔여 금액을 환불합니다.",
        notice: "출국 4~14일 전 취소 신청",
      };
    }

    const amount = paidBase.minus(fourWeekAccommodation).minus(fourWeekTuition).minus(refundedAmount);
    const safeAmount = amount.gte(zero) ? amount : zero;
    return {
      phase: "before_departure",
      label: "출국 3일 전부터",
      refundableAmount: safeAmount,
      detail: "4주분 학비와 4주분 숙박비를 제외한 잔여 금액을 환불합니다.",
      notice: "출국 3일 전부터 출국일까지 취소 신청",
    };
  }

  if (request > end) {
    return {
      phase: "no_refund",
      label: "수강 종료 후",
      refundableAmount: zero,
      detail: "수강 종료 후에는 환불하지 않습니다.",
      notice: "환불 신청 기간이 종료되었습니다.",
    };
  }

  const elapsedRatio = elapsedDays / totalDays;
  if (elapsedRatio > 0.75) {
    return {
      phase: "no_refund",
      label: "전체 기간 75% 초과",
      refundableAmount: zero,
      detail: "전체 연수기간의 75%를 초과한 경우 환불하지 않습니다.",
      notice: "SYA 환불 규정에 따른 환불 불가 구간입니다.",
    };
  }

  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const remainingWeeks = remainingDays / 7;
  const refundableWeeks = floorToFourWeeks(remainingWeeks);
  const remainingBase = paidBase.mul(refundableWeeks).div(totalWeeks);

  let rate = 0.3;
  let label = "전체 기간 50% 초과 ~ 75% 이내";
  if (elapsedRatio <= 0.25) {
    rate = 0.7;
    label = "전체 기간 25% 이내";
  } else if (elapsedRatio <= 0.5) {
    rate = 0.5;
    label = "전체 기간 50% 이내";
  }

  const amount = remainingBase.mul(rate).minus(refundedAmount);
  const safeAmount = amount.gte(zero) ? amount : zero;
  return {
    phase: "after_departure",
    label,
    refundableAmount: safeAmount,
    detail: `실제 완료 수납액을 기준으로 잔여 기간을 4주 단위로 계산하며, 해당 기준의 환불률(${Math.round(rate * 100)}%)을 적용합니다.`,
    notice: `환불 산정 대상 잔여 기간: ${refundableWeeks}주 · 실제 납부액 기준`,
  };
}
