import { prisma } from "@/lib/prisma";

export async function nextEnrollmentNumber(tx: typeof prisma) {
  const year = new Date().getFullYear();
  const prefix = `ENR-${year}-`;
  const latest = await tx.enrollments.findFirst({
    where: { enrollment_no: { startsWith: prefix } },
    orderBy: { enrollment_no: "desc" },
    select: { enrollment_no: true },
  });
  const n = latest ? Number(latest.enrollment_no.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}
