"use client";

// Client-side reader for the keep-alive SSE stream. Resolves with the final
// payload, optionally calling onHeartbeat with elapsedMs for progress UI.

export async function readResultStream<T>(
  res: Response,
  onHeartbeat?: (elapsedMs: number) => void,
): Promise<T> {
  if (!res.body) throw new Error("no response body");
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${txt.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let nl;
    while ((nl = buf.indexOf("\n\n")) !== -1) {
      const event = buf.slice(0, nl);
      buf = buf.slice(nl + 2);
      const dataLine = event.split("\n").find((l) => l.startsWith("data: "));
      if (!dataLine) continue;
      let parsed: { type: string; payload?: T; elapsedMs?: number; message?: string };
      try {
        parsed = JSON.parse(dataLine.slice(6));
      } catch {
        continue;
      }
      if (parsed.type === "heartbeat" && onHeartbeat && parsed.elapsedMs != null) {
        onHeartbeat(parsed.elapsedMs);
      } else if (parsed.type === "result") {
        return parsed.payload as T;
      } else if (parsed.type === "error") {
        throw new Error(parsed.message || "stream error");
      }
    }
  }
  throw new Error("stream ended without result");
}
