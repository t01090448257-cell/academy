SYA Academy - 프로그램·가격 구조 개편 (5개 프로그램 + 가변 기간 + 홈페이지 표시 최대 4개)

[적용 순서]
1) 이 압축의 academy 폴더 안 파일을 C:\Users\asatt\academy 아래 같은 경로에 덮어쓰기/추가
2) DB 확인 (읽기 전용):  prisma\sql\20261006_01_check_before.sql  → 결과 보관
3) ⚠️ 검토·승인 후 실행:   prisma\sql\20261006_02_program_options_public.sql
   - program_options 에 is_public / display_order 컬럼 추가, 신규 5개 프로그램 추가
   - 기존 REGULAR/CAMP, 가격 이력, 수납 데이터는 수정·삭제하지 않음
4) npx prisma generate
5) npm.cmd run build   → 성공 후  npm.cmd run build:netlify
   (두 빌드 모두 DB에서 현재 가격을 읽습니다. DB 연결이 안 되면 빌드가 멈춥니다)
6) 관리자 > 프로그램 관리 에서 과정별 「+ 기간 추가」로 기간·가격 입력, 홈페이지 표시(최대 4개)·순서 설정
7) 다시 npm.cmd run build:netlify → out 폴더를 Netlify Drop 업로드

[주의]
- 3) SQL 실행 전에 새 코드로 관리자 화면을 열면 "프로그램 정보를 불러오지 못했습니다"가 나옵니다(컬럼 없음).
- 신규 5개 프로그램은 가격이 비어 있는 상태로 시작합니다 → 입력 전까지 홈페이지는 "상담 시 안내".
- 공개 홈페이지는 정적 배포이므로 가격·표시 변경 후 반드시 재빌드·재업로드해야 반영됩니다.
