import { type NextRequest, NextResponse } from "next/server";
import { getHostVoice, setHostVoice } from "@/lib/host-config";

export const runtime = "nodejs";

export async function GET() {
  const cfg = await getHostVoice();
  return NextResponse.json(cfg ?? { voiceId: null, voiceName: null });
}

export async function POST(req: NextRequest) {
  try {
    const { voiceId, voiceName } = (await req.json()) as {
      voiceId: string;
      voiceName: string;
    };
    if (!voiceId || !voiceName) {
      return NextResponse.json(
        { error: "voiceId and voiceName required" },
        { status: 400 },
      );
    }
    await setHostVoice({ voiceId, voiceName });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
