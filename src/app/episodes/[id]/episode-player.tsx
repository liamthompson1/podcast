"use client";

import { useRef, useState, useEffect } from "react";
import type { BeatLabel } from "@/lib/types";

interface Chapter {
  beat: BeatLabel;
  startSeconds: number;
  title: string;
}

export function EpisodePlayer({
  audioUrl,
  chapters,
  title,
}: {
  audioUrl: string;
  chapters: Chapter[];
  title: string;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [t, setT] = useState(0);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const update = () => setT(a.currentTime);
    a.addEventListener("timeupdate", update);
    return () => a.removeEventListener("timeupdate", update);
  }, []);

  function jump(s: number) {
    if (ref.current) {
      ref.current.currentTime = s;
      ref.current.play();
    }
  }

  return (
    <section className="border border-[var(--border)] rounded-lg p-5 bg-[var(--surface)]">
      <audio
        ref={ref}
        controls
        preload="metadata"
        className="w-full"
        src={audioUrl}
      >
        <track kind="captions" />
      </audio>
      {chapters.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)] mb-3">
            Chapters
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {chapters.map((c, i) => {
              const next = chapters[i + 1]?.startSeconds ?? Infinity;
              const active = t >= c.startSeconds && t < next;
              return (
                <li key={c.beat}>
                  <button
                    onClick={() => jump(c.startSeconds)}
                    className={`w-full text-left px-3 py-2 rounded-md border text-xs transition-colors ${
                      active
                        ? "border-[var(--accent)] bg-[var(--accent)]/10"
                        : "border-[var(--border)] hover:border-[var(--muted)]"
                    }`}
                  >
                    <div className="text-[var(--muted)]">
                      {fmtTime(c.startSeconds)}
                    </div>
                    <div className="mt-0.5">{c.title}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className="sr-only">Now playing: {title}</p>
    </section>
  );
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
