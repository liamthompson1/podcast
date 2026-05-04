import crypto from "crypto";
import { cookies } from "next/headers";

export const COOKIE = "after-them-admin";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function password(): string {
  return process.env.ADMIN_PASSWORD || "humantime";
}

// Derive an opaque token from the password. The cookie holds this token,
// not the password itself. Anyone wanting to forge it would need to know
// the password — and the cookie is HTTP-only so client JS can't read it.
export function tokenFor(pw: string): string {
  return crypto
    .createHash("sha256")
    .update(`after-them.v1:${pw}`)
    .digest("hex");
}

export function expectedToken(): string {
  return tokenFor(password());
}

export function checkPassword(submitted: string): boolean {
  // constant-time compare to avoid leaking length/character info
  const a = Buffer.from(submitted, "utf8");
  const b = Buffer.from(password(), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Server components / route handlers — read the cookie via next/headers.
export async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  const v = c.get(COOKIE)?.value;
  if (!v) return false;
  const expected = expectedToken();
  if (v.length !== expected.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(v, "utf8"),
    Buffer.from(expected, "utf8"),
  );
}
