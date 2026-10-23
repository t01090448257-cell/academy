-- ============================================================================
-- [2단계] 프로그램·가격 구조 개편 마이그레이션 — ⚠️ 검토 후 승인하신 다음에만 실행하세요
--
-- 하는 일 (추가만 합니다. 기존 행은 수정·삭제하지 않습니다)
--   1. program_options 에 컬럼 2개 추가
--        is_public      boolean  NOT NULL DEFAULT false  — 홈페이지(학비표·맞춤견적서) 표시 여부
--        display_order  integer  NULL                    — 홈페이지 표시 순서 (1~99)
--      → 기존 기간 옵션(REGULAR, CAMP 포함)은 모두 is_public = false 로 들어갑니다.
--   2. 신규 5개 프로그램 추가 (이미 같은 code가 있으면 건너뜀)
--        REGULAR_ESL / REGULAR_BUSINESS / REGULAR_STUDY_ABROAD / CAMP_SUMMER_WINTER / CAMP_FAMILY
--      → 기간 옵션과 가격은 만들지 않습니다. 관리자 > 프로그램 관리에서 「+ 기간 추가」로 입력합니다.
--
-- 하지 않는 일
--   - 기존 REGULAR, CAMP 프로그램·기간 옵션·가격 이력 삭제/변경 없음
--   - enrollments / payments / refunds 등 수납 데이터 변경 없음
--   - 기존 가격을 신규 프로그램으로 자동 복사하지 않음 (과정별 금액이 다르므로 관리자가 직접 입력)
--
-- 여러 번 실행해도 안전하도록(IF NOT EXISTS / ON CONFLICT) 작성했습니다.
-- 실행 방법 예) psql "$DATABASE_URL" -f prisma/sql/20261006_02_program_options_public.sql
-- 실행 후: npx prisma generate
-- ============================================================================

BEGIN;

-- 1. 홈페이지 표시 여부 / 표시 순서 컬럼
ALTER TABLE program_options
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

ALTER TABLE program_options
  ADD COLUMN IF NOT EXISTS display_order integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'program_options_display_order_check'
      AND conrelid = 'program_options'::regclass
  ) THEN
    ALTER TABLE program_options
      ADD CONSTRAINT program_options_display_order_check
      CHECK (display_order IS NULL OR (display_order BETWEEN 1 AND 99));
  END IF;
END $$;

COMMENT ON COLUMN program_options.is_public IS '홈페이지(연수비용 학비표·맞춤견적서) 표시 여부. 프로그램별 최대 4개(관리자 API에서 확인)';
COMMENT ON COLUMN program_options.display_order IS '홈페이지 표시 순서 (1~99, 작을수록 먼저)';

-- 2. 신규 5개 프로그램 (홈페이지 과정과 1:1, 코드로 매핑)
INSERT INTO programs (code, name, description, is_active)
VALUES
  ('REGULAR_ESL',          '인텐시브 ESL',       '정규반', true),
  ('REGULAR_BUSINESS',     '비즈니스 실무 영어', '정규반', true),
  ('REGULAR_STUDY_ABROAD', '유학 준비',          '정규반', true),
  ('CAMP_SUMMER_WINTER',   '여름/겨울 방학캠프', '캠프반', true),
  ('CAMP_FAMILY',          '상시 가족캠프',      '캠프반', true)
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- ============================================================================
-- [3단계] 실행 후 확인 (읽기 전용)
-- ============================================================================

-- 신규 컬럼 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'program_options' AND column_name IN ('is_public', 'display_order');

-- 프로그램 목록: 기존 REGULAR, CAMP + 신규 5개 = 7개(이상)
SELECT id, code, name, is_active FROM programs ORDER BY id;

-- 건수 비교: program_options / program_prices / enrollments / payments 는 1단계 결과와 같아야 합니다.
SELECT
  (SELECT COUNT(*) FROM programs)        AS programs,
  (SELECT COUNT(*) FROM program_options) AS program_options,
  (SELECT COUNT(*) FROM program_prices)  AS program_prices,
  (SELECT COUNT(*) FROM enrollments)     AS enrollments,
  (SELECT COUNT(*) FROM payments)        AS payments;

-- ============================================================================
-- 되돌리기가 필요할 때 (참고용 — 신규 5개 프로그램에 기간·가격·수납이 아직 없을 때만)
--   BEGIN;
--   DELETE FROM programs p
--    WHERE p.code IN ('REGULAR_ESL','REGULAR_BUSINESS','REGULAR_STUDY_ABROAD','CAMP_SUMMER_WINTER','CAMP_FAMILY')
--      AND NOT EXISTS (SELECT 1 FROM program_options o WHERE o.program_id = p.id)
--      AND NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.program_id = p.id);
--   ALTER TABLE program_options DROP CONSTRAINT IF EXISTS program_options_display_order_check;
--   ALTER TABLE program_options DROP COLUMN IF EXISTS display_order;
--   ALTER TABLE program_options DROP COLUMN IF EXISTS is_public;
--   COMMIT;
-- ============================================================================
