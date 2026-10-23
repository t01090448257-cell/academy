import { SignJWT, jwtVerify } from "jose";

const secret = process.env.AUTH_SECRET;

if (!secret) {
  throw new Error("AUTH_SECRET이 설정되지 않았습니다.");
}

const secretKey = new TextEncoder().encode(secret);

export type AdminSession = {
  id: string;
  username: string;
  name: string;
  role: string;
};

export async function createSession(admin: AdminSession) {
  return await new SignJWT({
    id: admin.id,
    username: admin.username,
    name: admin.name,
    role: admin.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey);
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey);

    return {
      id: String(payload.id),
      username: String(payload.username),
      name: String(payload.name),
      role: String(payload.role),
    } satisfies AdminSession;
  } catch {
    return null;
  }
}