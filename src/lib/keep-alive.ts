// Vercel's edge has a 60s timeout on HTTP responses regardless of the
// function's maxDuration. We stream a heartbeat every few seconds so the
// connection stays open, then send the real payload as the last SSE event.
//
// Wire format (SSE):
//   data: {"type":"heartbeat","elapsedMs":15000}\n\n
//   data: {"type":"result","payload":{...}}\n\n
//   data: {"type":"error","message":"..."}\n\n
//
// Client uses readResultStream() below to consume.

export function keepAliveResponse<T>(
  task: () => Promise<T>,
  { heartbeatMs = 10_000 }: { heartbeatMs?: number } = {},
): Response {
  const encoder = new TextEncoder();
  const start = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (obj: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      const beat = setInterval(() => {
        send({ type: "heartbeat", elapsedMs: Date.now() - start });
      }, heartbeatMs);

      try {
        const payload = await task();
        send({ type: "result", payload });
      } catch (e) {
        send({
          type: "error",
          message: e instanceof Error ? e.message : "unknown",
        });
      } finally {
        clearInterval(beat);
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
