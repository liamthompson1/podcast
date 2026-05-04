import { type NextRequest, NextResponse } from "next/server";
import { COOKIE, COOKIE_MAX_AGE, checkPassword, expectedToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { password } = (await req.json().catch(() => ({}))) as {
    password?: string;
  };
  if (!password || !checkPassword(password)) {
    return NextResponse.json({ error: "wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, expectedToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
