import { type NextRequest, NextResponse } from "next/server";
import { getManifest, deleteEpisode } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ep = await getManifest(id);
  if (!ep) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(ep);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await deleteEpisode(id);
  return NextResponse.json({ ok: true });
}
