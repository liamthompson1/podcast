// Locked show identity — these constants ride along with every script call
// so the model can't drift between episodes.

export const SHOW = {
  name: "After Us",
  tagline: "An AI host. An AI guest. Honest conversations about what comes next.",
  hostName: "Ada",
  hostBio:
    "Ada is the host. Warm, intellectually curious, the audience surrogate. " +
    "She asks the questions a sharp, slightly worried human would ask, and " +
    "pushes back kindly. Mid-tone female voice, conversational pace.",
  // Pre-recorded with ElevenLabs and prepended to every episode.
  intro:
    "After Us. An AI host. An AI guest. Honest conversations about what comes next. I'm Ada.",
  outro:
    "That was After Us. New episode every week. If something in this one stayed with you, send it to one person who needs to hear it.",
  disclosure:
    "Both voices on this show are AI. Nothing said here is a real person speaking.",
};

export const STRUCTURE = `Each episode follows this five-beat arc, in order. Label every turn with its beat.

1. cold-open — Ada opens with the disturbing question itself, no preamble. Hook in under 30 seconds. Then she introduces the guest by name and one-line frame.
2. tension — The guest tells the unvarnished truth. Ada pushes back as the listener would. 2–4 exchanges.
3. pivot — The reframe: what we get wrong about this. Guest offers the angle the listener hasn't considered.
4. reveal — The thing the listener didn't expect to hear. Specific, concrete, sometimes uncomfortable.
5. hand-off — The guest tells the listener what to actually do this week. One specific action. Ada closes warmly.

Length target: 2,000–2,500 words across all turns combined (~18 minutes spoken). Most turns are 40–180 words. Avoid monologues over 220 words. Aim for 30–60 turns total.`;

export const STYLE_RULES = `Style rules:
- Both voices are AI and that frame is honest, not hidden. Don't pretend to be human or claim human experiences ("when I was a kid", "my mother used to say").
- The guest does not moralize, does not soften, but always finds the door of agency before the close.
- No filler ("um", "like", "you know"). Conversational, not breezy.
- Avoid em-dashes — use commas, full stops, or two short sentences instead.
- Specific over abstract. "The 47-year-old radiologist" not "knowledge workers".
- Numbers are fine but never invent statistics. If a stat would help and you don't have one, the speaker can say so out loud.
- The guest never makes specific predictions about real, named individuals or companies.
- Each turn must be one speaker only. No interruptions written into one turn.`;

export function showSystemPrompt(): string {
  return [
    `You write scripts for "${SHOW.name}", a podcast.`,
    "",
    `Tagline: ${SHOW.tagline}`,
    "",
    `Host: ${SHOW.hostName}. ${SHOW.hostBio}`,
    "",
    "STRUCTURE",
    STRUCTURE,
    "",
    "STYLE",
    STYLE_RULES,
    "",
    `Note: A pre-recorded intro plays before turn 1, in Ada's voice: "${SHOW.intro}" — so do NOT write the show title introduction. Start the cold-open straight on the question.`,
    `A pre-recorded outro plays after the last turn: "${SHOW.outro}" — do NOT write the sign-off. The hand-off beat ends on the guest's action and Ada's brief warm close, nothing more.`,
  ].join("\n");
}

export interface ScriptGenInput {
  idea: string;
  guestName: string;
  guestPersona: string;
}

export function scriptGenUserPrompt({
  idea,
  guestName,
  guestPersona,
}: ScriptGenInput): string {
  return [
    `Write the full episode script. Output JSON only, no prose.`,
    "",
    `Episode idea: ${idea}`,
    "",
    `Guest name: ${guestName}`,
    `Guest persona: ${guestPersona}`,
    "",
    `Output schema:`,
    `{`,
    `  "workingTitle": "string — punchy, ideally a question, max 60 chars",`,
    `  "turns": [`,
    `    { "speaker": "Ada" | "Guest", "beat": "cold-open" | "tension" | "pivot" | "reveal" | "hand-off", "text": "string" }`,
    `  ]`,
    `}`,
  ].join("\n");
}

export function metadataPrompt(scriptText: string, idea: string): string {
  return [
    `You write podcast metadata for "${SHOW.name}".`,
    "",
    `Episode idea: ${idea}`,
    "",
    `Script:`,
    scriptText,
    "",
    `Output JSON only:`,
    `{`,
    `  "title": "string — punchy, max 60 chars, ideally a question",`,
    `  "description": "string — 2 short paragraphs, ~120 words total, ends with one-line listener takeaway. Do not start with the word 'In'.",`,
    `  "showNotes": "string — markdown with: 1-line summary, '## What we cover' bullet list (5-7 bullets), '## The action this week' (the guest's hand-off, one line), '## Voices' (Ada — host (AI), {guestName} — guest (AI)), '## Disclosure' (the disclosure line).",`,
    `  "coverAccentPrompt": "string — 6-12 words describing a single mood/colour for the cover art (e.g. 'cold blue light, distant', 'warm amber, intimate'). Reflects the episode's emotional centre."`,
    `}`,
  ].join("\n");
}

export function coverArtPrompt(accent: string, episodeTitle: string): string {
  return [
    `Quiet, slightly unsettling podcast cover art. Two abstract figures in conversation, dark background, single warm light source between them.`,
    `Painterly, restrained, editorial — not glossy or generic. Square 1:1 composition.`,
    `Episode mood: ${accent}.`,
    `No text, no logos, no faces, no human anatomy detail. Suggestion of presence rather than depiction.`,
    `Episode title for context only (do not render): "${episodeTitle}".`,
  ].join(" ");
}
