// Gemini image generation for cover art.

const MODEL = "imagen-4.0-generate-001";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:predict`;

function key(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error("GEMINI_API_KEY missing");
  return k;
}

export interface ImageOpts {
  // "1K" → 1024×1024, "2K" → 2048×2048. Apple Podcasts wants 1400 min,
  // 3000 ideal. 2K is the largest Imagen 4 generates natively and clears
  // the floor comfortably.
  size?: "1K" | "2K";
}

export async function generateCoverImage(
  prompt: string,
  opts: ImageOpts = {},
): Promise<Buffer> {
  const res = await fetch(`${ENDPOINT}?key=${key()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: "1:1",
        personGeneration: "allow_adult",
        sampleImageSize: opts.size || "1K",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini image ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    predictions?: Array<{ bytesBase64Encoded?: string }>;
  };
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error("Gemini image: no prediction returned");
  return Buffer.from(b64, "base64");
}
