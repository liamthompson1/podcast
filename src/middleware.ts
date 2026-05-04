import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";

// NOTE: middleware can't import from /lib/auth because that uses next/headers
// (server-only). The token derivation has to be duplicated here in a way
// that works on the edge runtime.

const COOKIE = "after-them-admin";

function tokenFor(pw: string): string {
  return crypto
    .createHash("sha256")
    .update(`after-them.v1:${pw}`)
    .digest("hex");
}

function isAdmin(req: NextRequest): boolean {
  const expected = tokenFor(process.env.ADMIN_PASSWORD || "humantime");
  const got = req.cookies.get(COOKIE)?.value;
  if (!got || got.length !== expected.length) return false;
  // Edge runtime supports timingSafeEqual via the node crypto polyfill in
  // Next.js. If it ever stops, swap for a manual constant-time compare.
  return crypto.timingSafeEqual(
    Buffer.from(got, "utf8"),
    Buffer.from(expected, "utf8"),
  );
}

// Page paths that require admin. Edit page lives under /episodes/[id]/edit
// so we match that suffix specifically.
const ADMIN_PAGE_PATHS = ["/new", "/settings"];
const ADMIN_PAGE_SUFFIX = "/edit";

// API mutation routes that require admin. Anything not in this list is
// public — keep the read-only routes (GET episodes, GET show cover, GET
// transcript, GET host voice) accessible to listeners.
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

export function middleware(req: NextRequest) {
  if (!needsAdmin(req)) return NextResponse.next();
  if (isAdmin(req)) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "admin only" }, { status: 401 });
  }
  // For pages, bounce to /admin with a return path so login lands the user
  // back where they were heading.
  const url = req.nextUrl.clone();
  url.pathname = "/admin";
  url.search = `?next=${encodeURIComponent(
    req.nextUrl.pathname + req.nextUrl.search,
  )}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Match everything except Next.js internals + static assets — narrowing
  // here saves a function invocation per static request.
  matcher: ["/((?!_next/static|_next/image|favicon|icon|apple-icon|.*\\..*).*)"],
};
