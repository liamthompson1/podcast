import { type NextRequest, NextResponse } from "next/server";
import { getManifest } from "@/lib/storage";
import { SHOW } from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ep = await getManifest(id);
  if (!ep) return NextResponse.json({ error: "not found" }, { status: 404 });

  const lines = [
    `${SHOW.name} — Episode ${ep.number}`,
    ep.title,
    "",
    SHOW.disclosure,
    "",
    `[INTRO] Ada: ${SHOW.intro}`,
    "",
    ...ep.script.map(
      (t) => `[${t.beat}] ${t.speaker === "Ada" ? "Ada" : ep.guestName}: ${t.text}`,
    ),
    "",
    `[OUTRO] Ada: ${SHOW.outro}`,
  ];

  return new NextResponse(lines.join("\n\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="after-us-ep${ep.number}.txt"`,
    },
  });
}
