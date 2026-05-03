import { NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";
import { generateCoverImage } from "@/lib/gemini";
import { SHOW_COVER_PROMPT } from "@/lib/prompts";
import { keepAliveResponse } from "@/lib/keep-alive";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const PATH = "assets/show-cover.png";

function token(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

export async function GET() {
  try {
    const blobs = await list({ prefix: PATH, token: token() });
    const match = blobs.blobs.find((b) => b.pathname === PATH);
    return NextResponse.json({ url: match?.url ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ url: null, error: msg }, { status: 500 });
  }
}

export async function POST() {
  return keepAliveResponse(async () => {
    const buf = await generateCoverImage(SHOW_COVER_PROMPT, { size: "2K" });
    // Bust caches: include a fresh suffix so old CDN copies don't stick.
    const versioned = `assets/show-cover-${Date.now()}.png`;
    const { url } = await put(versioned, buf, {
      access: "public",
      contentType: "image/png",
      token: token(),
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    // Also write to the canonical path for stable lookups.
    await put(PATH, buf, {
      access: "public",
      contentType: "image/png",
      token: token(),
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return { url, versionedUrl: url };
  });
}

export async function DELETE() {
  try {
    const blobs = await list({ prefix: "assets/show-cover", token: token() });
    if (blobs.blobs.length) {
      await del(
        blobs.blobs.map((b) => b.url),
        { token: token() },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
