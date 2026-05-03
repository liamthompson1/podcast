"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PublishedEpisode, ScriptTurn } from "@/lib/types";
import { ScriptEditor } from "@/app/new/script-editor";
import { PublishProgress } from "@/app/new/publish-progress";
import { readResultStream } from "@/lib/client-stream";

export function EditForm({ episode }: { episode: PublishedEpisode }) {
  const router = useRouter();
  const [script, setScript] = useState<ScriptTurn[]>(episode.script);
  const [busy, setBusy] = useState<"none" | "publishing" | "deleting">("none");
  const [progressMs, setProgressMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function republish() {
    setBusy("publishing");
    setError(null);
    setProgressMs(0);
    try {
      const res = await fetch("/api/episode/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: episode.id,
          idea: episode.title,
          guestName: episode.guestName,
          guestVoiceId: episode.guestVoiceId,
          guestVoiceName: episode.guestVoiceName,
          script,
        }),
      });
      const updated = await readResultStream<PublishedEpisode>(
        res,
        setProgressMs,
      );
      router.push(`/episodes/${updated.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
      setBusy("none");
    }
  }

  async function remove() {
    if (
      !confirm(
        `Delete episode ${episode.number}: "${episode.title}"? This removes the audio, cover, and manifest from storage.`,
      )
    )
      return;
    setBusy("deleting");
    try {
      const res = await fetch(`/api/episodes/${episode.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
      setBusy("none");
    }
  }

  if (busy === "publishing") return <PublishProgress elapsedMs={progressMs} />;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link
        href={`/episodes/${episode.id}`}
        className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        ← Back to episode
      </Link>

      <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)] mt-6 mb-2">
        Editing · Episode {episode.number}
      </p>
      <h1 className="serif text-3xl mb-2">{episode.title}</h1>
      <p className="text-[var(--muted)] mb-6 leading-relaxed">
        Edit any turn directly, or talk to the editor agent on the right.
        Republishing regenerates the audio, cover art, title, and description
        from the updated script. The episode keeps its number and URL.
      </p>

      <ScriptEditor
        script={script}
        guestName={episode.guestName}
        onScriptChange={setScript}
      />

      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={remove}
          disabled={busy !== "none"}
          className="text-xs text-[var(--muted)] hover:text-red-400 disabled:opacity-40"
        >
          {busy === "deleting" ? "Deleting…" : "Delete episode"}
        </button>
        <div className="flex items-center gap-3">
          <Link
            href={`/episodes/${episode.id}`}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Cancel
          </Link>
          <button
            onClick={republish}
            disabled={busy !== "none"}
            className="bg-[var(--accent)] text-black px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 disabled:opacity-40"
          >
            Save &amp; republish
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
    </div>
  );
}
