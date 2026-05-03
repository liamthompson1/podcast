export type Speaker = "Ada" | "Guest";

export interface ScriptTurn {
  id: string;
  speaker: Speaker;
  text: string;
  beat?: BeatLabel;
  // True = this turn cuts in on the previous one (no breath before, fast cut).
  // Use for interruptions and backchannel reactions ("mm", "right").
  interruption?: boolean;
}

export type BeatLabel =
  | "cold-open"
  | "tension"
  | "pivot"
  | "reveal"
  | "hand-off";

export interface EpisodeDraft {
  id: string;
  idea: string;
  guestName: string;
  guestPersona: string;
  guestVoiceId: string;
  guestVoiceName: string;
  script: ScriptTurn[];
  createdAt: string;
}

export interface PublishedEpisode {
  id: string;
  number: number;
  title: string;
  description: string;
  showNotes: string;
  // Original inputs — kept on the manifest so /edit can regenerate from
  // scratch under whatever the current prompt rules are. Optional for
  // backwards-compat with episodes published before this was added.
  idea?: string;
  guestPersona?: string;
  guestName: string;
  guestVoiceId: string;
  guestVoiceName: string;
  script: ScriptTurn[];
  audioUrl: string;
  coverUrl: string;
  durationSeconds: number;
  createdAt: string;
  publishedAt: string;
  chapters: Array<{ beat: BeatLabel; startSeconds: number; title: string }>;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  preview_url?: string;
  description?: string;
}
