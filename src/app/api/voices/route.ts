import { NextResponse } from "next/server";
import { listVoices } from "@/lib/elevenlabs";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  try {
    const voices = await listVoices();
    return NextResponse.json({ voices });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
