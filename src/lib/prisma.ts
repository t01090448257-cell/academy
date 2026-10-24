import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * DB 연결 주소 선택
 * - Netlify (빌드·Functions): Netlify Database가 자동으로 넣어 주는 NETLIFY_DB_URL
 * - 로컬 개발: 기존 .env 의 DATABASE_URL
 * 운영 DB 주소를 로컬 .env 에 넣지 마세요. (NETLIFY_DB_URL이 있으면 그 값이 먼저 사용됩니다)
 * 빈 문자열은 설정되지 않은 것으로 봅니다.
 * 주소가 없어도 여기서는 오류를 내지 않습니다(기존 동작과 동일). 실제 쿼리를 실행할 때 연결 오류가 발생합니다.
 */
const databaseUrl = process.env.NETLIFY_DB_URL || process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({
  connectionString: databaseUrl!,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
