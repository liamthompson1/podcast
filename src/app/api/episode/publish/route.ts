import { type NextRequest, NextResponse } from "next/server";
import { anthropic, MODELS } from "@/lib/anthropic";
import { metadataPrompt, coverArtPrompt, SHOW } from "@/lib/prompts";
import { ttsParallel } from "@/lib/elevenlabs";
import { concatMp3, withLeadingBreak, estimateSpokenSeconds } from "@/lib/audio";
import { getHostVoice } from "@/lib/host-config";
import { generateCoverImage } from "@/lib/gemini";
import { getIntro, getOutro } from "@/lib/show-assets";
import {
  listEpisodes,
  putAudio,
  putCover,
  putManifest,
} from "@/lib/storage";
import type {
  PublishedEpisode,
  ScriptTurn,
  BeatLabel,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

interface PublishRequest {
  id: string; // client-generated uuid
  idea: string;
  guestName: string;
  guestVoiceId: string;
  guestVoiceName: string;
  script: ScriptTurn[];
}

const METADATA_TOOL = {
  name: "submit_metadata",
  description: "Submit final episode metadata.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      showNotes: { type: "string" },
      coverAccentPrompt: { type: "string" },
    },
    required: ["title", "description", "showNotes", "coverAccentPrompt"],
  },
};

async function generateMetadata(script: ScriptTurn[], idea: string) {
  const scriptText = script
    .map((t) => `[${t.beat}] ${t.speaker}: ${t.text}`)
    .join("\n");

  const result = await anthropic().messages.create({
    model: MODELS.metadata,
    max_tokens: 2000,
    tools: [METADATA_TOOL],
    tool_choice: { type: "tool", name: "submit_metadata" },
    messages: [{ role: "user", content: metadataPrompt(scriptText, idea) }],
  });

  const toolUse = result.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use")
    throw new Error("metadata tool not returned");

  return toolUse.input as {
    title: string;
    description: string;
    showNotes: string;
    coverAccentPrompt: string;
  };
}

function buildChapters(
  script: ScriptTurn[],
  introSeconds: number,
): Array<{ beat: BeatLabel; startSeconds: number; title: string }> {
  const labels: Record<BeatLabel, string> = {
    "cold-open": "Cold open",
    tension: "The tension",
    pivot: "The reframe",
    reveal: "The reveal",
    "hand-off": "What to do this week",
  };

  const out: Array<{ beat: BeatLabel; startSeconds: number; title: string }> = [];
  let elapsed = introSeconds;
  const seen = new Set<BeatLabel>();

  for (const turn of script) {
    if (!seen.has(turn.beat as BeatLabel)) {
      out.push({
        beat: turn.beat as BeatLabel,
        startSeconds: Math.round(elapsed),
        title: labels[turn.beat as BeatLabel] || turn.beat || "",
      });
      seen.add(turn.beat as BeatLabel);
    }
    elapsed += estimateSpokenSeconds(turn.text) + 0.4;
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PublishRequest;
    if (!body.id || !body.script?.length || !body.guestVoiceId) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    const host = await getHostVoice();
    if (!host) {
      return NextResponse.json(
        { error: "host voice not configured — pick Ada in /settings first" },
        { status: 400 },
      );
    }

    // Run metadata generation in parallel with TTS — both take time.
    const metadataPromise = generateMetadata(body.script, body.idea);

    // TTS for every turn, with a small breath at the start for natural pacing
    // (except the very first turn).
    const ttsItems = body.script.map((turn, i) => ({
      voiceId: turn.speaker === "Ada" ? host.voiceId : body.guestVoiceId,
      text: i === 0 ? turn.text : withLeadingBreak(turn.text, 350),
    }));
    const turnBuffersPromise = ttsParallel(ttsItems, 6);

    const [intro, outro] = await Promise.all([
      getIntro(host.voiceId).catch(() => null),
      getOutro(host.voiceId).catch(() => null),
    ]);

    const turnBuffers = await turnBuffersPromise;
    const metadata = await metadataPromise;

    const coverPromise = generateCoverImage(
      coverArtPrompt(metadata.coverAccentPrompt, metadata.title),
    );

    const audioParts: Buffer[] = [];
    if (intro) audioParts.push(intro);
    audioParts.push(...turnBuffers);
    if (outro) audioParts.push(outro);
    const finalAudio = concatMp3(audioParts);

    const cover = await coverPromise;

    const [audioUrl, coverUrl] = await Promise.all([
      putAudio(body.id, finalAudio),
      putCover(body.id, cover),
    ]);

    const existing = await listEpisodes();
    const number = existing.length + 1;

    const introSeconds = intro ? estimateSpokenSeconds(SHOW.intro) : 0;
    const totalSeconds = audioParts.reduce(
      (s, _b, i) =>
        s +
        (i === 0 && intro
          ? estimateSpokenSeconds(SHOW.intro)
          : i === audioParts.length - 1 && outro
            ? estimateSpokenSeconds(SHOW.outro)
            : estimateSpokenSeconds(body.script[i - (intro ? 1 : 0)]?.text || "")),
      0,
    );

    const ep: PublishedEpisode = {
      id: body.id,
      number,
      title: metadata.title,
      description: metadata.description,
      showNotes: metadata.showNotes,
      guestName: body.guestName,
      guestVoiceId: body.guestVoiceId,
      guestVoiceName: body.guestVoiceName,
      script: body.script,
      audioUrl,
      coverUrl,
      durationSeconds: Math.round(totalSeconds),
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      chapters: buildChapters(body.script, introSeconds),
    };

    await putManifest(ep);

    return NextResponse.json(ep);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
