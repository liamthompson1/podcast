// Gemini image generation for cover art. Two paths:
//   - Imagen 4 (text-only) for the show cover when there's nothing to
//     reference yet.
//   - Gemini 2.5 Flash Image (multimodal) for episode covers — we pass the
//     show cover as a reference image so every episode shares the brand's
//     exact visual identity, with only the small per-episode variation
//     specified in the prompt.

const IMAGEN = "imagen-4.0-generate-001";
const FLASH_IMAGE = "gemini-2.5-flash-image";

function key(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error("GEMINI_API_KEY missing");
  return k;
}

export interface ImageOpts {
  size?: "1K" | "2K";
}

export async function generateCoverImage(
  prompt: string,
  opts: ImageOpts = {},
): Promise<Buffer> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN}:predict?key=${key()}`;
  const res = await fetch(url, {
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
    throw new Error(`Imagen ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    predictions?: Array<{ bytesBase64Encoded?: string }>;
  };
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error("Imagen: no prediction returned");
  return Buffer.from(b64, "base64");
}

// Generate an image using a reference image as visual context. The reference
// locks the brand identity (palette, composition, lighting style) and the
// text prompt specifies the single variation for this episode.
export async function generateCoverImageFromReference(
  prompt: string,
  referencePngBuffer: Buffer,
): Promise<Buffer> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${FLASH_IMAGE}:generateContent?key=${key()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/png",
                data: referencePngBuffer.toString("base64"),
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Flash Image ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inline_data?: { data?: string };
          inlineData?: { data?: string };
        }>;
      };
    }>;
  };
  const part = data.candidates?.[0]?.content?.parts?.find(
    (p) => p.inline_data?.data || p.inlineData?.data,
  );
  const b64 = part?.inline_data?.data || part?.inlineData?.data;
  if (!b64) throw new Error("Flash Image: no image part in response");
  return Buffer.from(b64, "base64");
}

// Fetch the show cover from Vercel Blob to use as the visual reference.
// Cached at module level — only fetched once per cold start.
let _showCover: Buffer | null = null;
export async function getShowCoverReference(): Promise<Buffer | null> {
  if (_showCover) return _showCover;
  try {
    const { list } = await import("@vercel/blob");
    const blobs = await list({
      prefix: "assets/show-cover.png",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    const match = blobs.blobs.find(
      (b) => b.pathname === "assets/show-cover.png",
    );
    if (!match) return null;
    const res = await fetch(match.url, { cache: "no-store" });
    if (!res.ok) return null;
    _showCover = Buffer.from(await res.arrayBuffer());
    return _showCover;
  } catch {
    return null;
  }
}
