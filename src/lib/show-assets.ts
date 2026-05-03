// Pre-rendered intro/outro audio in Ada's voice. Generated once per voice
// and cached in Vercel Blob so every episode bookends with the exact same
// take — that's what makes a podcast intro "yours". When you change Ada's
// voice in /settings, the next publish regenerates with the new voice.

import { put, list } from "@vercel/blob";
import { tts } from "./elevenlabs";
import { SHOW } from "./prompts";

const PREFIX = "assets/";

function token(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN;
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
  const path = `${PREFIX}${kind}-${voiceId}.mp3`;
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
