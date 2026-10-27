// src/lib/siteContact.server.ts
// ─────────────────────────────────────────────────────────────────────
// 홈페이지 공개 연락처를 DB에서 읽는 서버 전용 함수 (브라우저에서 import 금지)
//
// - app_settings(id = 1)의 공개용 6개 컬럼만 select 합니다. (학원명·기본값 설정·관리자 ID 등은 읽지 않음)
// - 읽기만 합니다. 행이 없어도 만들지 않습니다. (관리자 /api/settings 의 upsert 와 다름)
// - 공개 API(/api/public/site-contact)와 빌드 시 [lang]/layout.tsx 가 함께 사용합니다.
// ─────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import { resolveSiteContact, type PublicSiteContactRaw, type SiteContact } from "@/lib/siteContact";

/** 빈 문자열은 null 로 (공개 응답은 DB 값 그대로, 비어 있으면 null) */
function nullIfBlank(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * DB 값 그대로 조회 (실패하면 예외를 그대로 던짐 — 공개 API가 500으로 응답)
 * 설정 행이 없으면 모든 항목 null
 */
export async function readPublicSiteContactRaw(): Promise<PublicSiteContactRaw> {
  const row = await prisma.app_settings.findUnique({
    where: { id: 1 },
    select: {
      contact_phone: true,
      local_phone: true,
      contact_email: true,
      address: true,
      korea_office_address: true,
      philippines_office_address: true,
    },
  });

  return {
    koreaPhone: nullIfBlank(row?.contact_phone),
    localPhone: nullIfBlank(row?.local_phone),
    email: nullIfBlank(row?.contact_email),
    campusAddress: nullIfBlank(row?.address),
    koreaOfficeAddress: nullIfBlank(row?.korea_office_address),
    philippinesOfficeAddress: nullIfBlank(row?.philippines_office_address),
  };
}

/**
 * 빌드(페이지 생성) 시 초기 연락처
 * DB 조회에 실패해도(연결 실패·컬럼 미적용 등) 빌드를 멈추지 않고 기존 홈페이지 기본값을 사용합니다.
 */
export async function loadPublicSiteContact(): Promise<SiteContact> {
  try {
    return resolveSiteContact(await readPublicSiteContactRaw());
  } catch (error) {
    console.warn(
      "[홈페이지 연락처] DB에서 연락처를 읽지 못해 기본값을 사용합니다:",
      error instanceof Error ? error.message : String(error)
    );
    return resolveSiteContact(null);
  }
}
