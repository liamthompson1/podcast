import { type NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODELS } from "@/lib/anthropic";
import { metadataPrompt, coverArtPrompt, SHOW } from "@/lib/prompts";
import { ttsParallel } from "@/lib/elevenlabs";
import { concatMp3, withLeadingBreak, estimateSpokenSeconds } from "@/lib/audio";
import { getHostVoice } from "@/lib/host-config";
import {
  generateCoverImage,
  generateCoverImageFromReference,
  getShowCoverReference,
} from "@/lib/gemini";
import { keepAliveResponse } from "@/lib/keep-alive";
import { getIntro, getOutro } from "@/lib/show-assets";
import {
  getManifest,
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
  guestPersona?: string;
  guestVoiceId: string;
  guestVoiceName: string;
  script: ScriptTurn[];
}

const METADATA_TOOL: Anthropic.Tool = {
  name: "submit_metadata",
  description: "Submit final episode metadata.",
  input_schema: {
    type: "object",
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

  return keepAliveResponse(async () => {

    // Run metadata generation in parallel with TTS — both take time.
    const metadataPromise = generateMetadata(body.script, body.idea);

    // TTS for every turn. Pacing rules:
    //   - First turn: no leading break.
    //   - Interruption / backchannel: tight cut, no break (sounds like cutting in).
    //   - Same-speaker continuation: short 200ms beat.
    //   - Speaker change (normal turn-take): 350ms breath.
    const ttsItems = body.script.map((turn, i) => {
      const voiceId = turn.speaker === "Ada" ? host.voiceId : body.guestVoiceId;
      let breakMs: number;
      if (i === 0 || turn.interruption) breakMs = 0;
      else if (body.script[i - 1].speaker === turn.speaker) breakMs = 200;
      else breakMs = 350;
      return { voiceId, text: withLeadingBreak(turn.text, breakMs) };
    });
    // ElevenLabs Creator plan caps at 5 concurrent requests. Stay at 4 to
    // leave headroom for any retry, and run intro/outro sequentially after.
    const turnBuffers = await ttsParallel(ttsItems, 4);
    const intro = await getIntro(host.voiceId).catch(() => null);
    const outro = await getOutro(host.voiceId).catch(() => null);
    const metadata = await metadataPromise;

    // Episode covers vary the show cover. If the show cover hasn't been
    // uploaded yet, fall back to text-only Imagen (still in brand style).
    const reference = await getShowCoverReference();
    const coverPrompt = coverArtPrompt(
      metadata.coverAccentPrompt,
      metadata.title,
    );
    const coverPromise = reference
      ? generateCoverImageFromReference(coverPrompt, reference)
      : generateCoverImage(coverPrompt);

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

    // If an episode with this id already exists (republish), keep its number
    // and original createdAt. Otherwise this is a fresh episode — assign the
    // next sequential number.
    const prior = await getManifest(body.id);
    const number = prior
      ? prior.number
      : (await listEpisodes()).length + 1;
    const createdAt = prior ? prior.createdAt : new Date().toISOString();

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
      idea: body.idea,
      guestPersona: body.guestPersona ?? prior?.guestPersona,
      guestName: body.guestName,
      guestVoiceId: body.guestVoiceId,
      guestVoiceName: body.guestVoiceName,
      script: body.script,
      audioUrl,
      coverUrl,
      durationSeconds: Math.round(totalSeconds),
      createdAt,
      publishedAt: new Date().toISOString(),
      chapters: buildChapters(body.script, introSeconds),
    };

    await putManifest(ep);

    return ep;
  });
}
