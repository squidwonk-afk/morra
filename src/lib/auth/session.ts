import { SignJWT, jwtVerify } from "jose";

/**
 * MORRA session: httpOnly JWT cookie (`morra_session`). DB access uses the Supabase
 * service role on the server; the browser does not hold a Supabase Auth session for
 * PIN login. Keep cookie path `/` + sameSite=lax so navigation does not drop auth.
 */
export const SESSION_COOKIE_NAME = "morra_session";

function getSecret(): Uint8Array | null {
  const raw = process.env.MORRA_SESSION_SECRET;
  if (!raw || raw.length < 32) return null;
  return new TextEncoder().encode(raw);
}

export async function signSession(userId: string): Promise<string> {
  const secret = getSecret();
  if (!secret) {
    throw new Error("MORRA_SESSION_SECRET must be set and at least 32 characters");
  }
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<{ userId: string } | null> {
  const secret = getSecret();
  if (!secret || !token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const sub = payload.sub;
    if (!sub || typeof sub !== "string") return null;
    return { userId: sub };
  } catch {
    return null;
  }
}
