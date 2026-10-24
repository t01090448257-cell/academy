import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI 설정
 *
 * DB 연결 주소: Netlify에서는 NETLIFY_DB_URL(Netlify Database 자동 주입), 로컬 개발에서는 .env 의 DATABASE_URL.
 *
 * - prisma generate (npm install 의 postinstall): 스키마만 읽어 클라이언트를 만들고 DB에 접속하지 않습니다.
 *   그래서 주소가 없어도 실패하지 않도록 env() 헬퍼(변수가 없으면 즉시 오류) 대신 process.env 를 사용합니다.
 *   (Prisma 공식 문서 권장: 명령에 따라 변수가 없을 수 있으면 process.env 사용, 없을 때는 '' 대체값)
 * - prisma db pull / migrate diff 등 실제 DB에 접속하는 명령은 주소가 반드시 필요합니다.
 *   주소가 없으면 그 명령에서 연결 오류가 납니다.
 */
const databaseUrl = process.env.NETLIFY_DB_URL || process.env.DATABASE_URL || "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
});
