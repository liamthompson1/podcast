// Pre-rendered intro/outro audio in Ada's voice. Generated once per voice
// AND once per text — the cache key includes a hash of the script so editing
// SHOW.intro / SHOW.outro automatically triggers a fresh recording on the
// next publish. Without this, the first cached version sticks forever.

import { put, list } from "@vercel/blob";
import { tts } from "./elevenlabs";
import { SHOW } from "./prompts";

const PREFIX = "assets/";

function token(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

// Tiny FNV-1a hash — stable across runtimes, 8 hex chars is plenty for
// avoiding collisions across our handful of intro/outro variants.
function shortHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

async function fetchExisting(pathname: string): Promise<Buffer | null> {
  try {
    const blobs = await list({ prefix: pathname, token: token() });
    const match = blobs.blobs.find((b) => b.pathname === pathname);
    if (!match) return null;
    const res = await fetch(match.url, { cache: "no-store" });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function ensureAsset(
  kind: "intro" | "outro",
  voiceId: string,
  text: string,
): Promise<Buffer> {
  const path = `${PREFIX}${kind}-${voiceId}-${shortHash(text)}.mp3`;
  const existing = await fetchExisting(path);
  if (existing) return existing;
  const buf = await tts({ voiceId, text });
  await put(path, buf, {
    access: "public",
    contentType: "audio/mpeg",
    token: token(),
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return buf;
}

export function getIntro(voiceId: string): Promise<Buffer> {
  return ensureAsset("intro", voiceId, SHOW.intro);
}

export function getOutro(voiceId: string): Promise<Buffer> {
  return ensureAsset("outro", voiceId, SHOW.outro);
}
