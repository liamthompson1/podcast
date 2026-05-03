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
  const [idea, setIdea] = useState<string>(episode.idea || "");
  const [guestPersona, setGuestPersona] = useState<string>(
    episode.guestPersona || "",
  );
  const [busy, setBusy] = useState<
    "none" | "publishing" | "deleting" | "regenerating"
  >("none");
  const [progressMs, setProgressMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showRegen, setShowRegen] = useState(false);

  async function regenerateScript() {
    if (!idea.trim() || !guestPersona.trim()) {
      setError("Need both episode idea and guest persona to regenerate.");
      return;
    }
    if (
      !confirm(
        "Regenerate the script from scratch using current style rules? This replaces every turn — your edits will be lost. (Audio + cover stay until you Save & republish.)",
      )
    )
      return;

    setBusy("regenerating");
    setError(null);
    setProgressMs(0);
    try {
      const res = await fetch("/api/script/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          guestName: episode.guestName,
          guestPersona,
        }),
      });
      const data = await readResultStream<{
        workingTitle: string;
        turns: ScriptTurn[];
      }>(res, setProgressMs);
      setScript(data.turns);
      setShowRegen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
    } finally {
      setBusy("none");
    }
  }

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
          idea: idea || episode.title,
          guestName: episode.guestName,
          guestPersona: guestPersona || episode.guestPersona,
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

  if (busy === "regenerating") {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border border-[var(--border)]" />
          <div className="absolute inset-0 rounded-full border-t-2 border-[var(--accent)] animate-spin" />
        </div>
        <h2 className="serif text-2xl mb-3">Rewriting</h2>
        <p className="text-[var(--muted)] text-sm">
          Generating a fresh script under current style rules…
        </p>
        <p className="text-xs text-[var(--muted)] mt-3">
          {Math.round(progressMs / 1000)}s elapsed
        </p>
      </div>
    );
  }

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

      <div className="mb-6 border border-[var(--border)] rounded-lg">
        <button
          onClick={() => setShowRegen((v) => !v)}
          className="w-full text-left px-4 py-3 text-sm text-[var(--muted)] hover:text-[var(--foreground)] flex items-center justify-between"
        >
          <span>
            Rewrite the script from scratch using the current style rules
          </span>
          <span className="text-xs">{showRegen ? "▾" : "▸"}</span>
        </button>
        {showRegen && (
          <div className="px-4 pb-4 pt-1 border-t border-[var(--border)] space-y-3">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-[var(--muted)] mb-1.5">
                Episode idea
              </label>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={2}
                placeholder="The original question this episode answers."
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-[var(--muted)] mb-1.5">
                Guest persona ({episode.guestName})
              </label>
              <textarea
                value={guestPersona}
                onChange={(e) => setGuestPersona(e.target.value)}
                rows={3}
                placeholder="Who the guest is and how they think."
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={regenerateScript}
              disabled={!idea.trim() || !guestPersona.trim()}
              className="bg-[var(--surface)] border border-[var(--accent)] text-[var(--accent)] px-4 py-2 rounded-full text-sm font-medium hover:bg-[var(--accent)] hover:text-black disabled:opacity-40"
            >
              Rewrite script from scratch
            </button>
            <p className="text-xs text-[var(--muted)]">
              Replaces every turn. Audio + cover stay until you Save &amp;
              republish.
            </p>
          </div>
        )}
      </div>

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
