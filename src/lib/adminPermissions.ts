import { prisma } from "@/lib/prisma";

export type PaymentPermission = "view" | "write" | "manage" | "delete";

export async function getCurrentAdmin(requestedId: string) {
  if (!/^\d{1,18}$/.test(requestedId)) return null;
  return prisma.admin_users.findUnique({
    where: { id: BigInt(requestedId) },
    include: { roles: true },
  });
}

export async function requirePaymentPermission(adminId: string, permission: PaymentPermission) {
  const admin = await getCurrentAdmin(adminId);
  if (!admin || !admin.is_active) return { ok: false as const, admin: null };
  const role = admin.roles.code;
  const ok =
    permission === "view"
      ? ["SUPER_ADMIN", "ADMIN", "STAFF"].includes(role)
      : permission === "write"
        ? ["SUPER_ADMIN", "ADMIN", "STAFF"].includes(role)
        : permission === "manage"
          ? ["SUPER_ADMIN", "ADMIN"].includes(role)
          : role === "SUPER_ADMIN";
  return { ok, admin };
}
