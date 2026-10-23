-- ============================================================================
-- [1단계] 실행 전 확인용 (읽기 전용 — 데이터를 바꾸지 않습니다)
-- 프로그램·가격 구조 개편 (5개 프로그램 + 가변 기간 + 홈페이지 표시) 마이그레이션 전에
-- 현재 DB 상태를 확인합니다. 결과를 캡처해 두면 실행 후 비교할 수 있습니다.
-- ============================================================================

-- 1) program_options 현재 컬럼 (is_public / display_order 가 아직 없어야 정상)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'program_options'
ORDER BY ordinal_position;

-- 2) program_options 의 기존 제약 조건 (CHECK / UNIQUE)
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'program_options'::regclass
ORDER BY conname;

-- 3) 현재 프로그램 목록 (기존 REGULAR, CAMP 확인 / 신규 5개 코드는 아직 없어야 정상)
SELECT id, code, name, is_active, created_at
FROM programs
ORDER BY id;

-- 4) 프로그램별 기간 옵션·가격 이력 건수
SELECT p.code, o.id AS option_id, o.duration_weeks, o.is_active,
       COUNT(pp.id) AS price_rows
FROM programs p
LEFT JOIN program_options o ON o.program_id = p.id
LEFT JOIN program_prices pp ON pp.program_option_id = o.id
GROUP BY p.code, o.id, o.duration_weeks, o.is_active
ORDER BY p.code, o.duration_weeks;

-- 5) 수강(수납) 기록이 연결된 프로그램·기간 (이 연결은 마이그레이션에서 바꾸지 않습니다)
SELECT p.code, o.duration_weeks, COUNT(e.id) AS enrollments
FROM enrollments e
LEFT JOIN programs p ON p.id = e.program_id
LEFT JOIN program_options o ON o.id = e.program_option_id
GROUP BY p.code, o.duration_weeks
ORDER BY p.code, o.duration_weeks;

-- 6) 비교용 전체 건수
SELECT
  (SELECT COUNT(*) FROM programs)        AS programs,
  (SELECT COUNT(*) FROM program_options) AS program_options,
  (SELECT COUNT(*) FROM program_prices)  AS program_prices,
  (SELECT COUNT(*) FROM enrollments)     AS enrollments,
  (SELECT COUNT(*) FROM payments)        AS payments;
