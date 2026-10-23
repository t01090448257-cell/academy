// SYA — 원장인사말 서명에서 원장 개인 이름만 제거 (7개 언어)
// 실행: C:\Users\asatt\academy 폴더에서  node scripts/remove-director-name.mjs
// 본문·제목·이미지·레이아웃·색상은 건드리지 않고 아래 7개 서명 문자열만 바꿉니다.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "src/components/about/AboutContent.tsx";

const REPLACEMENTS = [
  // ko
  ["SYA(Special Your Academy) 원장 이진호 & 교직원 일동",
   "SYA(Special Your Academy) 원장 & 교직원 일동"],
  // en
  ["Jinho Lee, Director of SYA (Special Your Academy), and the entire faculty",
   "The Director and the entire faculty of SYA (Special Your Academy)"],
  // ja
  ["SYA（Special Your Academy）院長 イ・ジンホ & 教職員一同",
   "SYA（Special Your Academy）院長 & 教職員一同"],
  // vi
  ["Giám đốc SYA (Special Your Academy) Lee Jin-ho & toàn thể đội ngũ",
   "Giám đốc SYA (Special Your Academy) & toàn thể đội ngũ"],
  // zh-TW
  ["SYA（Special Your Academy）院長 李鎮浩 及全體教職員",
   "SYA（Special Your Academy）院長 及全體教職員"],
  // mn
  ["SYA (Special Your Academy)-ийн захирал Ли Жин Хо ба бүх багш нар",
   "SYA (Special Your Academy)-ийн захирал ба бүх багш нар"],
  // ru
  ["Ли Джин Хо, директор SYA (Special Your Academy), и весь преподавательский состав",
   "Директор SYA (Special Your Academy) и весь преподавательский состав"],
];

const NAME_PATTERN = /이진호|진호|Jinho|Jin-ho|Jin ho|Lee Jin|イ・ジンホ|ジンホ|李鎮浩|鎮浩|Жин Хо|Джин Хо/i;

let src = readFileSync(FILE, "utf8");
let changed = 0;

for (const [from, to] of REPLACEMENTS) {
  const count = src.split(from).length - 1;
  if (count === 1) {
    src = src.replace(from, to);
    changed++;
    console.log("변경:", to);
  } else if (count === 0 && src.includes(to)) {
    console.log("이미 적용됨:", to);
  } else {
    console.error(`중단: 예상 문구를 ${count}회 찾음 → ${from}`);
    console.error("파일은 수정하지 않았습니다.");
    process.exit(1);
  }
}

if (NAME_PATTERN.test(src)) {
  console.error("중단: 원장 이름이 아직 남아 있습니다. 파일은 수정하지 않았습니다.");
  process.exit(1);
}

if (changed > 0) writeFileSync(FILE, src, "utf8");
console.log(`완료: ${changed}개 서명 수정, 원장 이름 잔존 0건`);
