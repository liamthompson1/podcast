"use client";

const STAGES = [
  "Writing the title and description",
  "Recording the voices",
  "Stitching the conversation",
  "Painting the cover art",
  "Uploading and finalising",
];

export function PublishProgress({ elapsedMs }: { elapsedMs: number }) {
  const seconds = Math.round(elapsedMs / 1000);
  // Rough stage allocation across an expected ~120s job.
  const stage = Math.min(Math.floor(seconds / 25), STAGES.length - 1);

  return (
    <div className="max-w-md mx-auto py-20 text-center">
      <div className="relative w-16 h-16 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full border border-[var(--border)]" />
        <div className="absolute inset-0 rounded-full border-t-2 border-[var(--accent)] animate-spin" />
      </div>
      <h2 className="serif text-2xl mb-3">Publishing</h2>
      <p className="text-[var(--muted)] text-sm">{STAGES[stage]}…</p>
      <p className="text-xs text-[var(--muted)] mt-3">{seconds}s elapsed</p>
      <p className="text-xs text-[var(--muted)] mt-6 max-w-xs mx-auto leading-relaxed">
        This takes 1&ndash;3 minutes for a full episode. Don&rsquo;t close the
        tab.
      </p>
    </div>
  );
}
