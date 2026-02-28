import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "safy_session";
export { COOKIE_NAME };
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "safy-dev-secret-change-in-production"
);

export interface SessionPayload {
  sub: string; // user id (uuid)
  pubkey?: string; // nostr pubkey hex
  exp: number;
}

const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: MAX_AGE,
  path: "/",
};

export async function createSession(userId: string, pubkey?: string): Promise<string> {
  const token = await new SignJWT({ pubkey })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setExpirationTime(`${MAX_AGE}s`)
    .setIssuedAt()
    .sign(JWT_SECRET);
  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      sub: payload.sub as string,
      pubkey: payload.pubkey as string | undefined,
      exp: payload.exp as number,
    };
  } catch {
    return null;
  }
}

export async function getSessionFromToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      sub: payload.sub as string,
      pubkey: payload.pubkey as string | undefined,
      exp: payload.exp as number,
    };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
