import { NextResponse, type NextRequest } from "next/server";

// NOTE: middleware runs on the Edge runtime — no node:crypto. Use Web Crypto
// (crypto.subtle) instead. The token derivation here must match
// expectedToken() in /lib/auth.ts so cookies set by the login route validate
// here.

const COOKIE = "after-them-admin";

async function tokenFor(pw: string): Promise<string> {
  const data = new TextEncoder().encode(`after-them.v1:${pw}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function isAdmin(req: NextRequest): Promise<boolean> {
  const got = req.cookies.get(COOKIE)?.value;
  if (!got) return false;
  const expected = await tokenFor(process.env.ADMIN_PASSWORD || "humantime");
  return safeEqual(got, expected);
}

const ADMIN_PAGE_PATHS = ["/new", "/settings"];
const ADMIN_PAGE_SUFFIX = "/edit";

const ADMIN_API_RULES: Array<{ method: string; pattern: RegExp }> = [
  { method: "POST", pattern: /^\/api\/episode\/publish$/ },
  { method: "POST", pattern: /^\/api\/episodes\/[^/]+\/regenerate-cover$/ },
  { method: "DELETE", pattern: /^\/api\/episodes\/[^/]+$/ },
  { method: "POST", pattern: /^\/api\/script\/(generate|edit)$/ },
  { method: "GET", pattern: /^\/api\/voices(\/.*)?$/ },
  { method: "POST", pattern: /^\/api\/voices\/preview$/ },
  { method: "POST", pattern: /^\/api\/config\/host-voice$/ },
  { method: "POST", pattern: /^\/api\/show\/cover$/ },
  { method: "DELETE", pattern: /^\/api\/show\/cover$/ },
  { method: "POST", pattern: /^\/api\/show\/cover\/upload$/ },
];

function needsAdmin(req: NextRequest): boolean {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    return ADMIN_API_RULES.some(
      (r) => r.method === req.method && r.pattern.test(pathname),
    );
  }
  if (ADMIN_PAGE_PATHS.includes(pathname)) return true;
  if (pathname.endsWith(ADMIN_PAGE_SUFFIX)) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  if (!needsAdmin(req)) return NextResponse.next();
  if (await isAdmin(req)) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "admin only" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/admin";
  url.search = `?next=${encodeURIComponent(
    req.nextUrl.pathname + req.nextUrl.search,
  )}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|icon|apple-icon|.*\\..*).*)"],
};
