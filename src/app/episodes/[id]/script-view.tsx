"use client";

import type { ScriptTurn, BeatLabel } from "@/lib/types";

const BEAT_LABELS: Record<BeatLabel, string> = {
  "cold-open": "Cold open",
  tension: "Tension",
  pivot: "Pivot",
  reveal: "Reveal",
  "hand-off": "Hand-off",
};

// Render audio tags ([pause], [laughs] etc.) as dim italic spans inline.
function renderText(text: string) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((p, i) =>
    /^\[[^\]]+\]$/.test(p) ? (
      <em
        key={i}
        className="text-[var(--muted)] not-italic text-[0.85em] opacity-60"
      >
        {p}
      </em>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

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
              <span className="text-[var(--foreground)]/90">
                {renderText(t.text)}
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
