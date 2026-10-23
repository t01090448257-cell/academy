// 관리자 프로그램 관리 화면 공용 타입 (GET /api/programs 응답 모양)

import type { PriceRow } from "./PriceForm";

export interface OptionRow {
  id: string;
  name: string;
  duration_weeks: number;
  is_active: boolean;
  /** 홈페이지 표시 여부 */
  is_public: boolean;
  /** 홈페이지 표시 순서 */
  display_order: number | null;
  current_price_id: string | null;
  program_prices: PriceRow[];
}

export interface ProgramRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  program_options: OptionRow[];
}

export type SaveResult = { kind: "saved"; message: string } | { kind: "sessionExpired" };
