import { put, list, del } from "@vercel/blob";
import type { PublishedEpisode } from "./types";

const PREFIX = {
  manifest: "episodes/",
  audio: "audio/",
  cover: "covers/",
};

function token(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

export async function putAudio(id: string, buf: Buffer): Promise<string> {
  const { url } = await put(`${PREFIX.audio}${id}.mp3`, buf, {
    access: "public",
    contentType: "audio/mpeg",
    token: token(),
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return url;
}

export async function putCover(id: string, buf: Buffer): Promise<string> {
  const { url } = await put(`${PREFIX.cover}${id}.png`, buf, {
    access: "public",
    contentType: "image/png",
    token: token(),
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return url;
}

export async function putManifest(ep: PublishedEpisode): Promise<string> {
  const { url } = await put(
    `${PREFIX.manifest}${ep.id}.json`,
    JSON.stringify(ep, null, 2),
    {
      access: "public",
      contentType: "application/json",
      token: token(),
      addRandomSuffix: false,
      allowOverwrite: true,
    },
  );
  return url;
}

export async function getManifest(
  id: string,
): Promise<PublishedEpisode | null> {
  const blobs = await list({ prefix: `${PREFIX.manifest}${id}.json`, token: token() });
  const match = blobs.blobs.find((b) => b.pathname === `${PREFIX.manifest}${id}.json`);
  if (!match) return null;
  const res = await fetch(match.url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as PublishedEpisode;
}

export async function listEpisodes(): Promise<PublishedEpisode[]> {
  const blobs = await list({ prefix: PREFIX.manifest, token: token() });
  const manifests = await Promise.all(
    blobs.blobs.map(async (b) => {
      try {
        const res = await fetch(b.url, { cache: "no-store" });
        if (!res.ok) return null;
        return (await res.json()) as PublishedEpisode;
      } catch {
        return null;
      }
    }),
  );
  return manifests
    .filter((m): m is PublishedEpisode => !!m)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function deleteEpisode(id: string): Promise<void> {
  const blobs = await list({ prefix: "", token: token() });
  const targets = blobs.blobs
    .filter(
      (b) =>
        b.pathname === `${PREFIX.manifest}${id}.json` ||
        b.pathname === `${PREFIX.audio}${id}.mp3` ||
        b.pathname === `${PREFIX.cover}${id}.png`,
    )
    .map((b) => b.url);
  if (targets.length) await del(targets, { token: token() });
}
