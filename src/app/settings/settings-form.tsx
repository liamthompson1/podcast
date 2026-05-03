"use client";

import { useMemo, useState } from "react";
import type { ElevenLabsVoice } from "@/lib/types";
import { VoicePicker } from "@/components/voice-picker";

export function SettingsForm({
  voices,
  current,
}: {
  voices: ElevenLabsVoice[];
  current: { voiceId: string | null; voiceName: string | null } | null;
}) {
  const initial = useMemo(
    () => voices.find((v) => v.voice_id === current?.voiceId) || null,
    [voices, current],
  );
  const [picked, setPicked] = useState<ElevenLabsVoice | null>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function save() {
    if (!picked) return;
    setSaving(true);
    try {
      const res = await fetch("/api/config/host-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: picked.voice_id,
          voiceName: picked.name,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setSavedAt(new Date().toLocaleTimeString());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <VoicePicker
        voices={voices}
        value={picked}
        onChange={setPicked}
        previewText="After Them. An AI host. An AI guest. Honest conversations about you. I'm Ada."
      />
      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={save}
          disabled={!picked || saving}
          className="bg-[var(--accent)] text-black px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save host voice"}
        </button>
        {savedAt && (
          <span className="text-xs text-[var(--muted)]">Saved at {savedAt}</span>
        )}
        {current?.voiceId && (
          <span className="text-xs text-[var(--muted)]">
            Currently: {current.voiceName}
          </span>
        )}
      </div>
    </div>
  );
}
