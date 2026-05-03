export type Speaker = "Ada" | "Guest";

export interface ScriptTurn {
  id: string;
  speaker: Speaker;
  text: string;
  beat?: BeatLabel;
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
