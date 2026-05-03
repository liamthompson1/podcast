"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ElevenLabsVoice, ScriptTurn, PublishedEpisode } from "@/lib/types";
import { VoicePicker } from "@/components/voice-picker";
import { ScriptEditor } from "./script-editor";
import { PublishProgress } from "./publish-progress";
import { readResultStream } from "@/lib/client-stream";

type Step = 1 | 2 | 3 | 4;

interface DraftState {
  step: Step;
  idea: string;
  guestName: string;
  guestPersona: string;
  guestVoiceId: string | null;
  guestVoiceName: string | null;
  script: ScriptTurn[];
  workingTitle: string;
}

const DRAFT_KEY = "afterus.draft.v1";

const EMPTY: DraftState = {
  step: 1,
  idea: "",
  guestName: "",
  guestPersona: "",
  guestVoiceId: null,
  guestVoiceName: null,
  script: [],
  workingTitle: "",
};

export function Wizard({
  voices,
  hostName,
}: {
  voices: ElevenLabsVoice[];
  hostName: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<DraftState>(EMPTY);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMs, setProgressMs] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setState(JSON.parse(raw) as DraftState);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const setField = <K extends keyof DraftState>(k: K, v: DraftState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const setVoice = (v: ElevenLabsVoice) =>
    setState((s) => ({ ...s, guestVoiceId: v.voice_id, guestVoiceName: v.name }));

  function reset() {
    if (!confirm("Start over? This clears the current draft.")) return;
    localStorage.removeItem(DRAFT_KEY);
    setState(EMPTY);
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    setProgressMs(0);
    try {
      const res = await fetch("/api/script/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: state.idea,
          guestName: state.guestName,
          guestPersona: state.guestPersona,
        }),
      });
      const data = await readResultStream<{
        workingTitle: string;
        turns: ScriptTurn[];
      }>(res, setProgressMs);
      setState((s) => ({
        ...s,
        script: data.turns,
        workingTitle: data.workingTitle,
        step: 3,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
    } finally {
      setGenerating(false);
    }
  }

  async function publish() {
    setPublishing(true);
    setError(null);
    setProgressMs(0);
    setState((s) => ({ ...s, step: 4 }));
    try {
      const id = crypto.randomUUID();
      const res = await fetch("/api/episode/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          idea: state.idea,
          guestName: state.guestName,
          guestPersona: state.guestPersona,
          guestVoiceId: state.guestVoiceId,
          guestVoiceName: state.guestVoiceName,
          script: state.script,
        }),
      });
      const data = await readResultStream<PublishedEpisode>(res, setProgressMs);
      localStorage.removeItem(DRAFT_KEY);
      router.push(`/episodes/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
      setPublishing(false);
      setState((s) => ({ ...s, step: 3 }));
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Stepper step={state.step} />

      {state.step === 1 && (
        <Step
          title="What's the idea?"
          subtitle="A brief, a thesis, a topic, or just a question — whatever shape the spark takes. The agent will sharpen it into the cold-open question and build the episode backwards from there."
        >
          <textarea
            value={state.idea}
            onChange={(e) => setField("idea", e.target.value)}
            placeholder={`e.g. "What happens to humans when their kids start preferring AI confidants — and the data shows most teenagers already do? Cover the Common Sense Media stat, the parents not noticing, what the AI does that the parent can't, and what to actually do about it without being weird."`}
            rows={6}
            className="w-full bg-white border border-[var(--border)] rounded-lg px-4 py-3 text-base leading-relaxed"
            autoFocus
          />
          <p className="text-xs text-[var(--muted)] mt-2">
            Short questions work too — both of these become the same kind of
            episode.
          </p>
          <ExampleChips
            onPick={(t) => setField("idea", t)}
            chips={[
              "Will you know what's real anymore?",
              "Can you love an AI?",
              "What happens when AI knows you better than you do?",
              "Who owns your face?",
            ]}
          />
          <Nav
            onNext={() => setField("step", 2)}
            nextDisabled={state.idea.trim().length < 8}
          />
        </Step>
      )}

      {state.step === 2 && (
        <Step
          title="Who's the guest?"
          subtitle={`The host is ${hostName} (the audience surrogate). The guest is the one who knows.`}
        >
          <label className="block text-sm text-[var(--muted)] mb-2">
            Guest name
          </label>
          <input
            type="text"
            value={state.guestName}
            onChange={(e) => setField("guestName", e.target.value)}
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-2.5 mb-6"
          />

          <label className="block text-sm text-[var(--muted)] mb-2">
            Guest persona
          </label>
          <textarea
            value={state.guestPersona}
            onChange={(e) => setField("guestPersona", e.target.value)}
            rows={5}
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm leading-relaxed mb-6"
          />

          <label className="block text-sm text-[var(--muted)] mb-2">
            Guest voice
          </label>
          <VoicePicker
            voices={voices}
            value={
              voices.find((v) => v.voice_id === state.guestVoiceId) || null
            }
            onChange={setVoice}
            previewText={`Hello. I'm ${state.guestName}.`}
          />

          <Nav
            onBack={() => setField("step", 1)}
            onNext={generate}
            nextLabel={
              generating
                ? `Writing… ${Math.round(progressMs / 1000)}s`
                : "Generate script"
            }
            nextDisabled={
              !state.guestName ||
              !state.guestPersona ||
              !state.guestVoiceId ||
              generating
            }
          />
          {error && (
            <p className="text-sm text-red-400 mt-3">{error}</p>
          )}
        </Step>
      )}

      {state.step === 3 && (
        <Step
          title={state.workingTitle || "Edit the script"}
          subtitle="Talk to the editor agent on the right to refine. When it sounds right, hit publish."
        >
          <ScriptEditor
            script={state.script}
            guestName={state.guestName}
            onScriptChange={(s) => setField("script", s)}
          />
          <Nav
            onBack={() => setField("step", 2)}
            onNext={publish}
            nextLabel="Publish episode"
            nextDisabled={publishing || state.script.length === 0}
            extra={
              <button
                onClick={reset}
                className="text-xs text-[var(--muted)] hover:text-red-400"
              >
                Start over
              </button>
            }
          />
          {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
        </Step>
      )}

      {state.step === 4 && <PublishProgress elapsedMs={progressMs} />}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const labels = ["Idea", "Guest", "Script", "Publish"];
  return (
    <div className="flex items-center gap-2 mb-10 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
      {labels.map((l, i) => (
        <span
          key={l}
          className={`flex items-center gap-2 ${
            i + 1 === step ? "text-[var(--foreground)]" : ""
          }`}
        >
          <span
            className={`inline-block w-5 h-5 rounded-full border ${
              i + 1 <= step
                ? "bg-[var(--accent)] text-black border-[var(--accent)] text-[10px] flex items-center justify-center"
                : "border-[var(--border)]"
            }`}
          >
            {i + 1 <= step ? i + 1 : ""}
          </span>
          {l}
          {i < labels.length - 1 && (
            <span className="mx-1 text-[var(--border)]">/</span>
          )}
        </span>
      ))}
    </div>
  );
}

function Step({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h1 className="serif text-3xl mb-2">{title}</h1>
      {subtitle && (
        <p className="text-[var(--muted)] mb-8 leading-relaxed">{subtitle}</p>
      )}
      {children}
    </section>
  );
}

function Nav({
  onBack,
  onNext,
  nextLabel = "Next",
  nextDisabled,
  extra,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="mt-8 flex items-center justify-between">
      <div>
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ← Back
          </button>
        )}
      </div>
      <div className="flex items-center gap-4">
        {extra}
        {onNext && (
          <button
            onClick={onNext}
            disabled={nextDisabled}
            className="bg-[var(--accent)] text-black px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 disabled:opacity-40"
          >
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function ExampleChips({
  chips,
  onPick,
}: {
  chips: string[];
  onPick: (s: string) => void;
}) {
  return (
    <div className="flex gap-2 mt-3 flex-wrap">
      {chips.map((c) => (
        <button
          key={c}
          onClick={() => onPick(c)}
          className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
        >
          {c}
        </button>
      ))}
    </div>
  );
}
