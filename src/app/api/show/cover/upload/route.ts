import { type NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const maxDuration = 60;

const PATH = "assets/show-cover.png";

function token(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const file = fd.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "no file" }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const contentType =
      file.type === "image/jpeg" ? "image/jpeg" : "image/png";
    const { url } = await put(PATH, buf, {
      access: "public",
      contentType,
      token: token(),
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return NextResponse.json({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
