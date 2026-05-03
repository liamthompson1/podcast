import { put, list } from "@vercel/blob";

const PATH = "config/host-voice.json";

interface HostConfig {
  voiceId: string;
  voiceName: string;
}

function token(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

export async function getHostVoice(): Promise<HostConfig | null> {
  const envId = process.env.HOST_VOICE_ID;
  if (envId) {
    return { voiceId: envId, voiceName: process.env.HOST_VOICE_NAME || "Ada" };
  }
  try {
    const blobs = await list({ prefix: PATH, token: token() });
    const match = blobs.blobs.find((b) => b.pathname === PATH);
    if (!match) return null;
    const res = await fetch(match.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as HostConfig;
  } catch {
    return null;
  }
}

export async function setHostVoice(cfg: HostConfig): Promise<void> {
  await put(PATH, JSON.stringify(cfg, null, 2), {
    access: "public",
    contentType: "application/json",
    token: token(),
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
