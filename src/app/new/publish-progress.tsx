"use client";

import { useEffect, useState } from "react";

const STAGES = [
  "Writing the title and description",
  "Recording Ada's voice",
  "Recording the guest",
  "Stitching the conversation",
  "Painting the cover art",
  "Uploading and finalising",
];

export function PublishProgress() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setI((n) => Math.min(n + 1, STAGES.length - 1)),
      6000,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="max-w-md mx-auto py-20 text-center">
      <div className="relative w-16 h-16 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full border border-[var(--border)]" />
        <div className="absolute inset-0 rounded-full border-t-2 border-[var(--accent)] animate-spin" />
      </div>
      <h2 className="serif text-2xl mb-3">Publishing</h2>
      <p className="text-[var(--muted)] text-sm">{STAGES[i]}…</p>
      <p className="text-xs text-[var(--muted)] mt-6 max-w-xs mx-auto leading-relaxed">
        This takes around a minute for a full episode. Don&rsquo;t close the
        tab.
      </p>
    </div>
  );
}
