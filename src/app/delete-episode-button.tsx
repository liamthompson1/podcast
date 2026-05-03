"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteEpisodeButton({
  id,
  title,
  number,
}: {
  id: string;
  title: string;
  number: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    if (
      !confirm(
        `Delete episode ${number}: "${title}"?\n\nThis removes the audio, cover, and manifest from storage. Cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/episodes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      router.refresh();
    } catch (e) {
      alert(`Failed to delete: ${e instanceof Error ? e.message : "unknown"}`);
      setBusy(false);
    }
  }

  return (
    <button
      onClick={go}
      disabled={busy}
      className="text-[var(--muted)] hover:text-red-500 disabled:opacity-50"
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
