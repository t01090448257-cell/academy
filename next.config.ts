import type { NextConfig } from "next";

/**
 * NETLIFY_DROP=1 일 때만 정적 export 설정을 사용합니다.
 * - 일반 개발/빌드(npm run dev, npm run build)는 기존과 동일하게 빈 설정({})으로 동작합니다.
 * - Netlify Drop용 빌드는 `npm run build:netlify` (scripts/build-netlify-drop.mjs)가 이 값을 켜고 실행합니다.
 */
const isNetlifyDrop = process.env.NETLIFY_DROP === "1";

const nextConfig: NextConfig = isNetlifyDrop
  ? {
      // 정적 HTML을 out/ 폴더로 출력
      output: "export",
      // 정적 호스팅에는 이미지 최적화 서버가 없으므로 원본 이미지를 그대로 제공
      images: { unoptimized: true },
    }
  : {
      /* config options here */
    };

export default nextConfig;
