import { NextResponse } from "next/server";
import { listEpisodes } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const episodes = await listEpisodes();
    return NextResponse.json({ episodes });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg, episodes: [] }, { status: 500 });
  }
}
