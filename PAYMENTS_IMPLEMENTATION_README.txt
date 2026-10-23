SYA Academy - 수납/결제 1단계 구현

적용 방법
1. academy 폴더 안의 파일을 C:\Users\asatt\academy 아래 같은 경로에 덮어쓰기/추가
2. prisma/schema.prisma가 실제 DB의 담당자 컬럼과 일치하는지 확인
3. 실행:
   npx prisma generate
   npm.cmd run build
   npm.cmd run dev
4. 관리자에서 /admin/payments 접속

주의: 이 압축은 DB SQL을 실행하지 않습니다. 실제 DB에는 이미 담당자/updated_at 컬럼이 추가된 상태를 전제로 합니다.
