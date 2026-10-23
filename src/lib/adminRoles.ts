// src/lib/adminRoles.ts
// 관리자 역할(roles.code) 확인 도우미 — 서버에서만 사용합니다.
// 로그인 정보(세션)에 들어 있는 역할만 믿지 않고, 요청마다 DB의 관리자 활성 상태·역할을 다시 확인합니다.
// (상담 삭제 API와 같은 방식. 기존 인증 구조·세션은 변경하지 않음)

import { prisma } from "@/lib/prisma";
import type { AdminSession } from "@/lib/auth";

export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "STAFF"] as const;
export type AdminRoleCode = (typeof ADMIN_ROLES)[number];

/** 프로그램 가격 등록·수정이 허용되는 역할 (조회는 로그인한 모든 관리자) */
export const PRICE_MANAGER_ROLES: readonly string[] = ["SUPER_ADMIN", "ADMIN"];

export interface ActiveAdmin {
  id: bigint;
  role: string;
}

/** 세션의 관리자를 DB에서 다시 확인. 없거나 비활성이면 null */
export async function getActiveAdmin(session: Pick<AdminSession, "id"> | null): Promise<ActiveAdmin | null> {
  if (!session || !/^\d{1,18}$/.test(session.id)) return null;
  const admin = await prisma.admin_users.findUnique({
    where: { id: BigInt(session.id) },
    select: { id: true, is_active: true, roles: { select: { code: true } } },
  });
  if (!admin || !admin.is_active) return null;
  return { id: admin.id, role: admin.roles.code };
}

export function canManagePrices(role: string | null | undefined): boolean {
  return !!role && PRICE_MANAGER_ROLES.includes(role);
}
