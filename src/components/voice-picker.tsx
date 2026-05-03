"use client";

import { useMemo, useRef, useState } from "react";
import type { ElevenLabsVoice } from "@/lib/types";

interface Props {
  voices: ElevenLabsVoice[];
  value: ElevenLabsVoice | null;
  onChange: (v: ElevenLabsVoice) => void;
  previewText?: string;
}

export function VoicePicker({ voices, value, onChange, previewText }: Props) {
  const [filter, setFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">(
    "all",
  );
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return voices.filter((v) => {
      if (q && !v.name.toLowerCase().includes(q)) return false;
      if (genderFilter !== "all") {
        const g = (v.labels?.gender || "").toLowerCase();
        if (!g.includes(genderFilter)) return false;
      }
      return true;
    });
  }, [voices, filter, genderFilter]);

  async function preview(v: ElevenLabsVoice) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingId === v.voice_id) {
      setPlayingId(null);
      return;
    }
    setPlayingId(v.voice_id);
    try {
      // Prefer ElevenLabs' canned preview if it exists — it's free + instant.
      // Fall back to our /api/voices/preview which renders the show line in
      // the picked voice (uses an API credit).
      let url = v.preview_url;
      if (!url) {
        const res = await fetch("/api/voices/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voiceId: v.voice_id, text: previewText }),
        });
        if (!res.ok) throw new Error("preview failed");
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      await audio.play();
    } catch {
      setPlayingId(null);
    }
  }

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter voices…"
          className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm placeholder:text-[var(--muted)]"
        />
        <div className="flex gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-md p-1">
          {(["all", "female", "male"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGenderFilter(g)}
              className={`px-3 py-1 text-xs rounded ${
                genderFilter === g
                  ? "bg-[var(--accent)] text-black"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
        {filtered.map((v) => {
          const selected = value?.voice_id === v.voice_id;
          return (
            <li key={v.voice_id}>
              <div
                className={`group flex items-center gap-3 border rounded-lg p-3 transition-colors cursor-pointer ${
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent)]/5"
                    : "border-[var(--border)] hover:border-[var(--muted)]"
                }`}
                onClick={() => onChange(v)}
              >
                <button
                  type="button"
                  aria-label="Preview voice"
                  onClick={(e) => {
                    e.stopPropagation();
                    preview(v);
                  }}
                  className="w-9 h-9 shrink-0 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--accent)] hover:text-black"
                >
                  {playingId === v.voice_id ? "■" : "▶"}
                </button>
                <div className="min-w-0">
                  <div className="text-sm truncate">{v.name}</div>
                  <div className="text-xs text-[var(--muted)] truncate">
                    {[
                      v.labels?.gender,
                      v.labels?.accent,
                      v.labels?.age,
                      v.labels?.use_case,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                {selected && (
                  <span className="ml-auto text-xs text-[var(--accent)]">
                    selected
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {filtered.length === 0 && (
        <p className="text-sm text-[var(--muted)] mt-4">
          No voices match. Try clearing filters.
        </p>
      )}
    </div>
  );
}
