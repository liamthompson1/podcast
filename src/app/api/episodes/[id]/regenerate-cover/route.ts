import { type NextRequest, NextResponse } from "next/server";
import { anthropic, MODELS } from "@/lib/anthropic";
import { coverArtPrompt, metadataPrompt } from "@/lib/prompts";
import {
  generateCoverImage,
  generateCoverImageFromReference,
  getShowCoverReference,
} from "@/lib/gemini";
import { getManifest, putCover, putManifest } from "@/lib/storage";
import { keepAliveResponse } from "@/lib/keep-alive";
import type Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 120;

// Regenerate just the cover for an existing episode using the current brand
// (with show cover as reference) and a fresh accent prompt derived from the
// existing script. Audio + manifest stay otherwise unchanged.

const ACCENT_TOOL: Anthropic.Tool = {
  name: "submit_accent",
  description:
    "Submit the cover-art accent variation for this episode (one small physical-scene change within the locked brand).",
  input_schema: {
    type: "object",
    properties: {
      coverAccentPrompt: { type: "string" },
    },
    required: ["coverAccentPrompt"],
  },
};

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ep = await getManifest(id);
  if (!ep) return NextResponse.json({ error: "not found" }, { status: 404 });

  return keepAliveResponse(async () => {
    const scriptText = ep.script
      .map((t) => `[${t.beat}] ${t.speaker}: ${t.text}`)
      .join("\n");

    // Reuse the metadata prompt to get a fresh accent in the new brand
    // vocabulary (physical-scene variation, no colour drift).
    const metaResult = await anthropic().messages.create({
      model: MODELS.metadata,
      max_tokens: 1500,
      tools: [ACCENT_TOOL],
      tool_choice: { type: "tool", name: "submit_accent" },
      messages: [
        {
          role: "user",
          content: metadataPrompt(scriptText, ep.idea || ep.title),
        },
      ],
    });

    const toolUse = metaResult.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use")
      throw new Error("accent tool not returned");
    const accent = (toolUse.input as { coverAccentPrompt: string })
      .coverAccentPrompt;

    const reference = await getShowCoverReference();
    const prompt = coverArtPrompt(accent, ep.title);
    const buf = reference
      ? await generateCoverImageFromReference(prompt, reference)
      : await generateCoverImage(prompt);
    const coverUrl = await putCover(ep.id, buf);

    const updated = {
      ...ep,
      coverUrl: `${coverUrl}?v=${Date.now()}`,
    };
    await putManifest(updated);

    return updated;
  });
}
