"use client";

import { useState } from "react";
import type { ScriptTurn, BeatLabel } from "@/lib/types";

interface Props {
  script: ScriptTurn[];
  guestName: string;
  onScriptChange: (s: ScriptTurn[]) => void;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  changes?: string[];
}

const BEAT_LABELS: Record<BeatLabel, string> = {
  "cold-open": "Cold open",
  tension: "Tension",
  pivot: "Pivot",
  reveal: "Reveal",
  "hand-off": "Hand-off",
};

const BEAT_TINTS: Record<BeatLabel, string> = {
  "cold-open": "border-l-purple-400/40",
  tension: "border-l-red-400/40",
  pivot: "border-l-blue-400/40",
  reveal: "border-l-amber-400/60",
  "hand-off": "border-l-emerald-400/40",
};

export function ScriptEditor({ script, guestName, onScriptChange }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Script ready. Tell me what to change — for example: 'tighten the cold open', 'make the guest push back harder on tension', 'add a beat where Ada confesses she's worried'. I'll edit in place.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const wordCount = script.reduce(
    (s, t) => s + t.text.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
  const minutes = (wordCount / 155).toFixed(1);

  async function send() {
    if (!input.trim() || busy) return;
    const userMsg = input.trim();
    setInput("");
    const next = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(next);
    setBusy(true);

    try {
      const res = await fetch("/api/script/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script,
          userMessage: userMsg,
          history: messages,
          guestName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "edit failed");
      onScriptChange(data.script);
      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.assistantMessage,
          changes: data.changes,
        },
      ]);
    } catch (e) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: `Failed: ${e instanceof Error ? e.message : "unknown"}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function editTurn(id: string, text: string) {
    onScriptChange(script.map((t) => (t.id === id ? { ...t, text } : t)));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 mt-2">
      {/* Script column */}
      <div>
        <div className="flex items-center gap-3 text-xs text-[var(--muted)] mb-3">
          <span>{script.length} turns</span>
          <span>·</span>
          <span>{wordCount.toLocaleString()} words</span>
          <span>·</span>
          <span>~{minutes} min spoken</span>
        </div>
        <ol className="space-y-2 max-h-[640px] overflow-y-auto pr-2 scrollbar-thin">
          {script.map((t) => {
            const beat = (t.beat || "tension") as BeatLabel;
            const isAda = t.speaker === "Ada";
            return (
              <li
                key={t.id}
                className={`rounded-md border-l-2 ${BEAT_TINTS[beat]} bg-[var(--surface)] border border-[var(--border)] px-4 py-3`}
              >
                <div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1.5">
                  <span className="flex items-center gap-2">
                    <span
                      className={`font-medium ${isAda ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}
                    >
                      {isAda ? "Ada" : guestName}
                    </span>
                    <span>· {BEAT_LABELS[beat]}</span>
                    {t.interruption && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)]">
                        cuts in
                      </span>
                    )}
                  </span>
                  <span className="opacity-50">{t.id}</span>
                </div>
                <textarea
                  value={t.text}
                  onChange={(e) => editTurn(t.id, e.target.value)}
                  rows={Math.max(2, Math.ceil(t.text.length / 90))}
                  className="w-full bg-transparent text-sm leading-relaxed resize-none focus:outline-none"
                />
              </li>
            );
          })}
        </ol>
      </div>

      {/* Editor agent column */}
      <aside className="flex flex-col h-[640px] border border-[var(--border)] rounded-lg bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            Editor agent
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-[var(--background)] border border-[var(--border)] rounded-lg p-3"
                  : "text-[var(--foreground)]"
              }`}
            >
              {m.content}
              {m.changes && m.changes.length > 0 && (
                <ul className="mt-2 text-xs text-[var(--muted)] space-y-0.5">
                  {m.changes.map((c, j) => (
                    <li key={j}>· {c}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {busy && (
            <div className="text-sm text-[var(--muted)] italic">Editing…</div>
          )}
        </div>
        <div className="border-t border-[var(--border)] p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Tighten the cold open. ⌘↵ to send."
            rows={3}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-[var(--muted)]">⌘↵ to send</span>
            <button
              onClick={send}
              disabled={!input.trim() || busy}
              className="bg-[var(--accent)] text-black text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
