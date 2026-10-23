import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";
import readline from "readline";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(text) {
  return new Promise((resolve) => {
    rl.question(text, resolve);
  });
}

async function main() {
  console.log("");
  console.log("=================================");
  console.log("   SYA 관리자 계정 생성");
  console.log("=================================");
  console.log("");

  const username =
    (await question("관리자 아이디 (기본값: admin): ")).trim() || "admin";

  const name =
    (await question("관리자 이름 (기본값: 최고관리자): ")).trim() ||
    "최고관리자";

  const email =
    (await question("이메일 (기본값: admin@sya.com): ")).trim() ||
    "admin@sya.com";

  const password = await question("비밀번호: ");

  if (!password) {
    throw new Error("비밀번호를 입력해야 합니다.");
  }

  if (password.length < 8) {
    throw new Error("비밀번호는 최소 8자 이상이어야 합니다.");
  }

  // SUPER_ADMIN 역할 확인
  const roleResult = await pool.query(
    `SELECT id, code, name
     FROM roles
     WHERE code = 'SUPER_ADMIN'
     LIMIT 1`
  );

  if (roleResult.rows.length === 0) {
    throw new Error("SUPER_ADMIN 역할을 찾을 수 없습니다.");
  }

  const role = roleResult.rows[0];

  // 동일한 아이디가 이미 존재하는지 확인
  const existingUser = await pool.query(
    `SELECT id, username
     FROM admin_users
     WHERE username = $1
     LIMIT 1`,
    [username]
  );

  if (existingUser.rows.length > 0) {
    throw new Error(
      `이미 존재하는 관리자 아이디입니다: ${username}`
    );
  }

  // 비밀번호를 bcrypt로 해시
  const passwordHash = await bcrypt.hash(password, 12);

  // 관리자 계정 생성
  const result = await pool.query(
    `INSERT INTO admin_users
      (
        username,
        password_hash,
        name,
        email,
        role_id,
        is_active,
        created_at,
        updated_at
      )
     VALUES
      ($1, $2, $3, $4, $5, true, NOW(), NOW())
     RETURNING
      id,
      username,
      name,
      email,
      role_id,
      is_active,
      created_at`,
    [username, passwordHash, name, email, role.id]
  );

  const admin = result.rows[0];

  console.log("");
  console.log("=================================");
  console.log(" 관리자 계정 생성 완료");
  console.log("=================================");
  console.log(`ID       : ${admin.id}`);
  console.log(`아이디   : ${admin.username}`);
  console.log(`이름     : ${admin.name}`);
  console.log(`이메일   : ${admin.email}`);
  console.log(`권한     : ${role.code}`);
  console.log(`상태     : ${admin.is_active ? "활성" : "비활성"}`);
  console.log("");
  console.log("비밀번호는 DB에 평문으로 저장되지 않았습니다.");
  console.log("=================================");
  console.log("");
}

main()
  .catch((error) => {
    console.error("");
    console.error("관리자 계정 생성 실패:");
    console.error(error.message);
    console.error("");
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await pool.end();
  });