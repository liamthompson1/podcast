import type { ElevenLabsVoice } from "./types";

const API = "https://api.elevenlabs.io/v1";

function key(): string {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error("ELEVENLABS_API_KEY missing");
  return k;
}

export async function listVoices(): Promise<ElevenLabsVoice[]> {
  const res = await fetch(`${API}/voices`, {
    headers: { "xi-api-key": key() },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`ElevenLabs voices ${res.status}`);
  const data = (await res.json()) as { voices: ElevenLabsVoice[] };
  return data.voices;
}

export interface TtsOpts {
  voiceId: string;
  text: string;
  modelId?: string;
  // v3-style stability presets: "creative" | "natural" | "robust"
  // Numbers also accepted for v2 models.
  stability?: number | "creative" | "natural" | "robust";
  similarityBoost?: number;
  style?: number;
  speed?: number;
  // For v3 expressive model — keeps audio tags like [laughs] [pause] working.
  useV3?: boolean;
}

export async function tts(opts: TtsOpts): Promise<Buffer> {
  const {
    voiceId,
    text,
    useV3 = true,
    similarityBoost = 0.75,
    style = 0.4,
    speed = 1.0,
  } = opts;

  const modelId = opts.modelId || (useV3 ? "eleven_v3" : "eleven_turbo_v2_5");
  // v3 wants "natural" by default for podcast feel; turbo wants 0.5 numeric.
  const stability =
    opts.stability ?? (useV3 ? ("natural" as const) : 0.5);

  const res = await fetch(`${API}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": key(),
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        style,
        speed,
        use_speaker_boost: true,
      },
      output_format: "mp3_44100_128",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS ${res.status}: ${body.slice(0, 200)}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

export async function ttsParallel(
  items: Array<{ voiceId: string; text: string }>,
  concurrency = 6,
): Promise<Buffer[]> {
  const out: Buffer[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await tts(items[idx]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return out;
}
