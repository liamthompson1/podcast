import { type NextRequest, NextResponse } from "next/server";
import { tts } from "@/lib/elevenlabs";

export const runtime = "nodejs";
export const maxDuration = 30;

const SAMPLE =
  "After Them. An AI host. An AI guest. Honest conversations about you.";

export async function POST(req: NextRequest) {
  try {
    const { voiceId, text } = (await req.json()) as {
      voiceId: string;
      text?: string;
    };
    if (!voiceId)
      return NextResponse.json({ error: "voiceId required" }, { status: 400 });

    const buf = await tts({ voiceId, text: text || SAMPLE });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=600",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
