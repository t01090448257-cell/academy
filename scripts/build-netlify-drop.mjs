// scripts/build-netlify-drop.mjs
// ─────────────────────────────────────────────────────────────────────
// Netlify Drop 업로드용 "공개 홈페이지" 정적 사이트(out/ 폴더)를 만드는 스크립트
//
// 실행:  npm run build:netlify
//
// 하는 일
//  1) 기존 out/ 폴더를 out.previous/ 로 옮겨 둡니다. (이전 빌드 파일이 섞여 업로드되지 않도록 새 out/을 처음부터 생성)
//  2) 정적 export와 함께 쓸 수 없는 것들을 잠시 .netlify-drop-backup/ 으로 옮겨 둡니다.
//     - src/proxy.ts        : proxy/middleware는 정적 export 불가
//     - src/app/api         : API Route(관리자 로그인·DB 조회). 정적 호스팅에서는 동작할 수 없음
//     - src/app/admin       : 관리자 화면(로그인 쿠키·DB 사용). 공개 홈페이지 업로드 대상이 아님
//     - .next/dev/types     : 개발 서버가 만든 타입 캐시(위 경로를 참조) — 빌드 타입 검사 오류 방지
//  3) NETLIFY_DROP=1 로 next build 실행 → out/ 폴더 생성
//  4) 빌드가 성공하든 실패하든(중간에 Ctrl+C로 멈춰도) 옮겨 둔 파일·폴더를 반드시 원래 자리로 되돌립니다.
//  5) out/_redirects 생성 (proxy.ts가 하던 언어 자동 이동을 Netlify가 대신 처리)
//
// 소스는 삭제하거나 고치지 않고 "빌드하는 동안만" 자리를 옮깁니다.
// 기존 npm run dev / npm run build (관리자·DB 포함 서버 빌드)에는 영향이 없습니다.
// 빌드 중에는 npm run dev 서버를 꺼 주세요. (Windows에서 폴더를 옮길 수 없는 경우가 있음)
// ─────────────────────────────────────────────────────────────────────

import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const root = process.cwd();
const backupDir = path.join(root, ".netlify-drop-backup");
const outDir = path.join(root, "out");
const previousOutDir = path.join(root, "out.previous");

/** 정적 빌드 동안만 옮겨 둘 대상 (프로젝트 기준 경로) */
const TEMP_EXCLUDES = [
  { rel: "src/proxy.ts", label: "src/proxy.ts (proxy)" },
  { rel: "src/app/api", label: "src/app/api (API Route: 관리자 인증·DB)" },
  { rel: "src/app/admin", label: "src/app/admin (관리자 화면)" },
  // npm run dev가 만든 타입 파일(위 API·관리자 경로를 가리킴). 빌드 타입 검사에서 "파일 없음" 오류가 나지 않도록 함께 옮김
  { rel: ".next/dev/types", label: ".next/dev/types (개발 서버 타입 캐시)" },
];

const original = (item) => path.join(root, ...item.rel.split("/"));
const backup = (item) => path.join(backupDir, ...item.rel.split("/"));
// 이전 버전 스크립트가 쓰던 proxy.ts 백업 위치
const legacyProxyBackup = path.join(backupDir, "proxy.ts");

function log(message) {
  console.log(`[netlify-drop] ${message}`);
}

function fail(message) {
  console.error(`\n[netlify-drop] ❌ ${message}\n`);
  process.exit(1);
}

// ── 0. 실행 위치 확인 ──
if (!existsSync(path.join(root, "package.json")) || !existsSync(path.join(root, "src", "app"))) {
  fail("academy 프로젝트 폴더(C:\\Users\\asatt\\academy)에서 실행해 주세요.");
}

// ── 1. 이전 실행이 중간에 끊겨 백업 폴더에 남아 있는 것이 있으면 먼저 복구 ──
function recoverLeftovers() {
  const pending = [];
  if (existsSync(legacyProxyBackup)) pending.push({ from: legacyProxyBackup, to: original(TEMP_EXCLUDES[0]), label: "src/proxy.ts" });
  for (const item of TEMP_EXCLUDES) {
    if (existsSync(backup(item))) pending.push({ from: backup(item), to: original(item), label: item.rel });
  }
  if (pending.length === 0) return;

  const conflicts = pending.filter((p) => existsSync(p.to));
  if (conflicts.length > 0) {
    fail(
      "이전 빌드의 백업과 원래 파일이 둘 다 있습니다:\n" +
        conflicts.map((p) => `   - ${p.label}  ↔  ${path.relative(root, p.from)}`).join("\n") +
        "\n   두 쪽을 비교해 올바른 쪽을 원래 자리에 두고, .netlify-drop-backup 폴더를 지운 뒤 다시 실행하세요."
    );
  }
  for (const p of pending) {
    renameSync(p.from, p.to);
    log(`이전 실행에서 남아 있던 ${p.label} 를 원래 자리로 복구했습니다.`);
  }
  rmSync(backupDir, { recursive: true, force: true });
}
recoverLeftovers();

// ── 2. 기존 out/ 정리: out.previous/ 로 보관 (그 전 백업은 삭제) ──
if (existsSync(outDir)) {
  try {
    if (existsSync(previousOutDir)) rmSync(previousOutDir, { recursive: true, force: true });
    renameSync(outDir, previousOutDir);
    log("기존 out/ 을 out.previous/ 로 옮겼습니다. (새 out/ 을 처음부터 생성)");
  } catch (error) {
    fail(
      "기존 out/ 폴더를 옮기지 못했습니다. out 폴더를 연 탐색기·프로그램을 닫고 다시 실행해 주세요.\n   " +
        (error && error.message ? error.message : String(error))
    );
  }
}

// ── 3. 정적 export에서 제외할 파일·폴더를 잠시 옮기기 + 어떤 경우에도 되돌리기 ──
const moved = [];
let restoring = false;
function restoreAll() {
  if (restoring || moved.length === 0) return;
  restoring = true;
  for (const item of [...moved].reverse()) {
    try {
      if (existsSync(backup(item)) && !existsSync(original(item))) {
        mkdirSync(path.dirname(original(item)), { recursive: true });
        renameSync(backup(item), original(item));
        log(`${item.rel} 원래 자리로 복구 완료`);
      } else if (existsSync(backup(item)) && existsSync(original(item))) {
        console.error(`[netlify-drop] ⚠️ ${item.rel} 이 이미 있어 백업(${path.relative(root, backup(item))})을 덮어쓰지 않았습니다. 직접 확인해 주세요.`);
        continue;
      }
      moved.splice(moved.indexOf(item), 1);
    } catch (error) {
      console.error(
        `[netlify-drop] ⚠️ ${item.rel} 자동 복구 실패! ${path.relative(root, backup(item))} 를 ${item.rel} 로 직접 옮겨 주세요.`,
        error
      );
    }
  }
  if (moved.length === 0) rmSync(backupDir, { recursive: true, force: true });
  restoring = false;
}
process.on("exit", restoreAll);
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    restoreAll();
    process.exit(130);
  });
}

for (const item of TEMP_EXCLUDES) {
  if (!existsSync(original(item))) continue;
  try {
    mkdirSync(path.dirname(backup(item)), { recursive: true });
    renameSync(original(item), backup(item));
    moved.push(item);
    log(`${item.label} → 잠시 .netlify-drop-backup/ 으로 이동 (빌드 후 자동 복구)`);
  } catch (error) {
    restoreAll();
    fail(
      `${item.rel} 을(를) 옮기지 못했습니다. npm run dev 서버나 해당 폴더를 연 프로그램을 닫고 다시 실행해 주세요.\n   ` +
        (error && error.message ? error.message : String(error))
    );
  }
}

// ── 4. 정적 export 빌드 ──
const buildStartedAt = Date.now();
let exitCode = 1;
try {
  const require = createRequire(import.meta.url);
  const nextBin = require.resolve("next/dist/bin/next", { paths: [root] });
  log("next build (NETLIFY_DROP=1) 실행 중...\n");
  const result = spawnSync(process.execPath, [nextBin, "build"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, NETLIFY_DROP: "1" },
  });
  exitCode = result.status ?? 1;
} finally {
  restoreAll();
}

if (moved.length > 0) {
  fail("일부 파일·폴더를 원래 자리로 되돌리지 못했습니다. 위의 ⚠️ 안내대로 직접 옮긴 뒤 다시 실행해 주세요.");
}

if (exitCode !== 0) {
  fail(
    "정적 빌드가 실패했습니다. 위의 오류 메시지를 확인해 주세요.\n" +
      "   (proxy.ts·API·관리자 화면은 원래 자리로 복구되었습니다. 이전 결과물은 out.previous/ 에 있습니다)"
  );
}

const indexHtml = path.join(outDir, "index.html");
if (!existsSync(indexHtml)) {
  fail("빌드는 끝났지만 out/index.html 이 없습니다. next.config.ts의 NETLIFY_DROP 설정을 확인해 주세요.");
}
if (statSync(indexHtml).mtimeMs < buildStartedAt - 1000) {
  fail("out/index.html 이 이번 빌드에서 새로 만들어지지 않았습니다. out 폴더를 지우고 다시 실행해 주세요.");
}

// ── 5. out/_redirects 생성 (proxy.ts의 언어 자동 이동을 Netlify에서 대신 처리) ──
function readLocales() {
  const fallback = { locales: ["ko", "en", "ja", "vi", "zh-TW", "mn", "ru"], defaultLocale: "ko" };
  try {
    const source = readFileSync(path.join(root, "src", "config", "i18n.ts"), "utf8");
    const list = source.match(/export const locales\s*=\s*\[([^\]]+)\]/);
    const def = source.match(/export const defaultLocale[^=]*=\s*"([^"]+)"/);
    if (!list || !def) return fallback;
    const locales = [...list[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    return locales.length ? { locales, defaultLocale: def[1] } : fallback;
  } catch {
    return fallback;
  }
}

const { locales, defaultLocale } = readLocales();
// 한국어를 가장 먼저 검사 (한국어 브라우저가 영어를 2순위로 두어도 한국어로 이동하도록)
const order = [defaultLocale, ...locales.filter((l) => l !== defaultLocale && l !== "en"), ...(locales.includes("en") && defaultLocale !== "en" ? ["en"] : [])];
const languageRules = order.map((locale) => {
  const lang = locale.split("-")[0]; // zh-TW → zh (중국어 계열 전체를 번체로)
  return `/  /${locale}  302!  Language=${lang}`;
});

// 로케일 없이 들어온 하위 페이지 → 기본 언어로 이동
const sections = readdirSync(path.join(root, "src", "app", "[lang]")).filter((name) =>
  statSync(path.join(root, "src", "app", "[lang]", name)).isDirectory()
);
const sectionRules = sections.flatMap((name) => [
  `/${name}    /${defaultLocale}/${name}          302`,
  `/${name}/*  /${defaultLocale}/${name}/:splat   302`,
]);

const redirects = [
  "# Netlify Drop용 리다이렉트 (scripts/build-netlify-drop.mjs가 자동 생성)",
  "# 개발 서버의 src/proxy.ts가 하던 언어 자동 이동을 대신합니다.",
  "",
  "# 1) 첫 화면(/) → 브라우저 언어에 맞는 페이지",
  ...languageRules,
  `/  /${defaultLocale}  302!`,
  "",
  "# 2) 언어 없이 들어온 하위 페이지 → 기본 언어",
  ...sectionRules,
  "",
].join("\n");

writeFileSync(path.join(outDir, "_redirects"), redirects, "utf8");
log("out/_redirects 생성 완료");

// ── 6. 결과 요약 ──
function countHtml(dir) {
  let count = 0;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) count += countHtml(full);
    else if (name.endsWith(".html")) count += 1;
  }
  return count;
}

const checks = ["index.html", `${defaultLocale}.html`, path.join(defaultLocale, "services.html"), path.join(defaultLocale, "programs.html"), "_redirects"];
console.log("");
log(`새 out/ 생성: ${new Date(buildStartedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} 빌드`);
log(`HTML 파일 ${countHtml(outDir)}개 생성`);
for (const file of checks) {
  log(`${existsSync(path.join(outDir, file)) ? "✓" : "✗"} out/${file.replace(/\\/g, "/")}`);
}
// 관리자 화면·API가 업로드 폴더에 들어가지 않았는지 확인
for (const name of ["admin", "api"]) {
  const leaked = existsSync(path.join(outDir, name)) || existsSync(path.join(outDir, `${name}.html`));
  log(`${leaked ? "⚠️ 포함됨" : "✓ 제외됨"} out/${name}`);
}
console.log(`\n[netlify-drop] ✅ 완료! Netlify Drop에서 이 폴더를 업로드하세요:\n   ${outDir}\n`);
