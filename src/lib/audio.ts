// MP3 stitching: ElevenLabs returns mp3_44100_128 frames. Concatenating the
// raw buffers works reliably because every chunk is the same format and the
// decoder ignores cross-frame metadata. For per-turn silence we pass a leading
// SSML <break> tag in the text so ElevenLabs renders the pause as part of the
// turn's MP3 — no separate silence file needed.

export function withLeadingBreak(text: string, ms: number): string {
  if (ms <= 0) return text;
  return `<break time="${ms}ms" /> ${text}`;
}

export function concatMp3(buffers: Buffer[]): Buffer {
  return Buffer.concat(buffers);
}

// Estimate spoken duration from text. ElevenLabs averages ~155 wpm at speed=1.
// Used for chapter timestamps before we know real durations.
export function estimateSpokenSeconds(text: string, wpm = 155): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return (words / wpm) * 60;
}
