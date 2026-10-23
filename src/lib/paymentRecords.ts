import { Prisma } from "@/generated/prisma/client";

export function serializePaymentData(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (_, v) => typeof v === "bigint" ? v.toString() : v));
}

export function toDateOnly(value: string | null) {
  return value ? new Date(`${value}T00:00:00.000Z`) : undefined;
}

export function decimal(value: number | string) {
  return new Prisma.Decimal(String(value));
}
