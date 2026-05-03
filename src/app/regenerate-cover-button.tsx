"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readResultStream } from "@/lib/client-stream";

export function RegenerateCoverButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  async function go() {
    setBusy(true);
    setElapsed(0);
    try {
      const res = await fetch(`/api/episodes/${id}/regenerate-cover`, {
        method: "POST",
      });
      await readResultStream(res, (ms) => setElapsed(Math.round(ms / 1000)));
      router.refresh();
    } catch {
      // surface via console — keep the row tidy
      console.error("regenerate cover failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={go}
      disabled={busy}
      className="text-[var(--muted)] hover:text-[var(--accent)] disabled:opacity-50"
    >
      {busy ? `Painting cover… ${elapsed}s` : "Regenerate cover"}
    </button>
  );
}
