// src/lib/consultationOptions.ts
// 상담 등록·수정 화면의 선택지 (서버 페이지에서만 사용)
// - 담당자: admin_users (비밀번호 등은 조회하지 않음)
// - 상담 유형: 관리자 화면 기본 유형 + DB에 이미 저장된 유형

import { prisma } from "@/lib/prisma";
import { CONSULTATION_TYPE_PRESETS } from "@/lib/consultationValidation";

export interface AdminOption {
  id: string;
  name: string;
  username: string;
  is_active: boolean;
}

export async function getConsultationFormOptions(): Promise<{ admins: AdminOption[]; typeOptions: string[] }> {
  const [admins, typeRows] = await Promise.all([
    prisma.admin_users.findMany({
      select: { id: true, name: true, username: true, is_active: true },
      orderBy: [{ is_active: "desc" }, { name: "asc" }],
    }),
    prisma.consultations.findMany({
      where: { inquiry_type: { not: null } },
      distinct: ["inquiry_type"],
      select: { inquiry_type: true },
      orderBy: { inquiry_type: "asc" },
    }),
  ]);

  return {
    admins: admins.map((admin: { id: bigint; name: string; username: string; is_active: boolean }) => ({
      id: admin.id.toString(),
      name: admin.name,
      username: admin.username,
      is_active: admin.is_active,
    })),
    typeOptions: Array.from(
      new Set<string>([
        ...CONSULTATION_TYPE_PRESETS,
        ...typeRows
          .map((row: { inquiry_type: string | null }) => row.inquiry_type)
          .filter((value: string | null): value is string => !!value),
      ])
    ),
  };
}
