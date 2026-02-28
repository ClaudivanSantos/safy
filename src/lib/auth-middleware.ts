import { jwtVerify } from "jose";

export const COOKIE_NAME = "safy_session";

function getSecret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET ?? "safy-dev-secret-change-in-production"
  );
}

export async function verifySessionCookie(token: string | undefined): Promise<{ sub: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { sub: payload.sub as string };
  } catch {
    return null;
  }
}
