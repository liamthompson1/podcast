"use client";

import type { ScriptTurn, BeatLabel } from "@/lib/types";

const BEAT_LABELS: Record<BeatLabel, string> = {
  "cold-open": "Cold open",
  tension: "Tension",
  pivot: "Pivot",
  reveal: "Reveal",
  "hand-off": "Hand-off",
};

export function ScriptView({
  script,
  guestName,
}: {
  script: ScriptTurn[];
  guestName: string;
}) {
  let currentBeat: BeatLabel | null = null;
  return (
    <div className="space-y-1">
      {script.map((t) => {
        const beat = (t.beat || "tension") as BeatLabel;
        const beatChanged = beat !== currentBeat;
        currentBeat = beat;
        const isAda = t.speaker === "Ada";
        return (
          <div key={t.id}>
            {beatChanged && (
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)] mt-6 mb-2">
                {BEAT_LABELS[beat]}
              </p>
            )}
            <p className="text-sm leading-[1.7] mb-3">
              <span
                className={`font-medium mr-2 ${isAda ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}
              >
                {isAda ? "Ada" : guestName}:
              </span>
              <span className="text-[var(--foreground)]/90">{t.text}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
