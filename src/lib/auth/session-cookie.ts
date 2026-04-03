/**
 * morra_session options: stable path, no accidental drops on subdomains.
 * `secure` on production or any HTTPS deploy (e.g. Vercel preview).
 */
export function morraSessionCookieBase() {
  const secure =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  return {
    httpOnly: true as const,
    secure,
    sameSite: "lax" as const,
    path: "/",
  };
}
