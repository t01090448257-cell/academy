// src/lib/publicTuition.server.ts
// ─────────────────────────────────────────────────────────────────────
// 홈페이지 공개 교육비를 DB에서 읽는 서버 전용 함수 (브라우저에서 import 금지)
//
// - 지금(Netlify Drop 정적 배포)은 빌드 시점에 [lang]/layout.tsx 에서 한 번 호출되어 정적 HTML에 들어갑니다.
//   → 관리자에서 가격·표시 기간을 바꾼 뒤에는 npm.cmd run build:netlify 로 다시 빌드·업로드해야 반영됩니다.
// - 나중에 홈페이지를 서버 방식으로 바꾸면 이 함수를 요청 시점에 호출(또는 /api/programs/public-prices 사용)하면 됩니다.
//
// 가격 선택 규칙은 새로 만들지 않고 수납 등록과 같은 findCurrentPrice() 를 그대로 사용합니다.
//   (활성 + 적용 시작일 ≤ 오늘 + 종료일 없음 또는 오늘 이후 → 시작일 최신순 → id 최신순 1건)
// 여기에 더해 KRW 가격만, 홈페이지 표시(is_public) + 기간 활성 + 프로그램 활성인 것만, 프로그램별 최대 4개.
//
// DB를 읽지 못하면 오류를 던져 빌드를 멈춥니다. (가격 없이 잘못된 홈페이지가 만들어지는 것을 방지)
// ─────────────────────────────────────────────────────────────────────

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { findCurrentPrice } from "@/lib/programPrices";
import { todayKst } from "@/lib/programPriceValidation";
import { PROGRAM_CODES, PROGRAM_CODE_COURSES, isProgramCode } from "@/config/programPricing";
import {
  emptyPublicTuition,
  selectPublicOptions,
  type PublicOptionCandidate,
  type PublicTuitionData,
} from "@/lib/publicTuition";

async function readPublicTuition(): Promise<PublicTuitionData> {
  const date = todayKst();

  const programs = await prisma.programs
    .findMany({
      where: { code: { in: [...PROGRAM_CODES] } },
      select: {
        code: true,
        is_active: true,
        program_options: {
          select: {
            id: true,
            duration_weeks: true,
            is_active: true,
            is_public: true,
            display_order: true,
          },
        },
      },
    })
    .catch((error: unknown) => {
      throw new Error(
        "[홈페이지 교육비] DB에서 프로그램 가격을 읽지 못했습니다. .env 의 DATABASE_URL 과 DB 연결, " +
          "program_options.is_public / display_order 컬럼(마이그레이션 SQL 실행 여부)을 확인해 주세요.\n" +
          (error instanceof Error ? error.message : String(error))
      );
    });

  const data = emptyPublicTuition(date);
  const found = new Set<string>();

  for (const program of programs) {
    const code: string = program.code;
    if (!isProgramCode(code)) continue;
    found.add(code);
    if (!program.is_active) continue;

    const targets = program.program_options.filter((option) => option.is_public && option.is_active);
    const candidates: PublicOptionCandidate[] = await Promise.all(
      targets.map(async (option) => {
        const current = await findCurrentPrice(prisma, option.id, date);
        return {
          optionId: option.id.toString(),
          weeks: option.duration_weeks,
          isPublic: option.is_public,
          isActive: option.is_active,
          displayOrder: option.display_order,
          currentPrice: current ? { price: String(current.price), currency: String(current.currency) } : null,
        };
      })
    );

    data.courses[PROGRAM_CODE_COURSES[code]] = selectPublicOptions(candidates);
  }

  const missing = PROGRAM_CODES.filter((code) => !found.has(code));
  if (missing.length > 0) {
    console.warn(
      `[홈페이지 교육비] DB에 없는 프로그램 코드: ${missing.join(", ")} — 해당 과정은 "상담 시 안내"로 표시됩니다. ` +
        "마이그레이션 SQL(prisma/sql/20261006_02_program_options_public.sql) 실행 여부를 확인해 주세요."
    );
  }

  return data;
}

/** 같은 렌더링 안에서는 한 번만 조회 */
export const loadPublicTuition = cache(readPublicTuition);
