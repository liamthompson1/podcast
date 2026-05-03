import { getManifest } from "@/lib/storage";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EpisodePlayer } from "./episode-player";
import { ScriptView } from "./script-view";

export const dynamic = "force-dynamic";

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}m ${sec.toString().padStart(2, "0")}s`;
}

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ep = await getManifest(id);
  if (!ep) notFound();

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ← All episodes
        </Link>
        <Link
          href={`/episodes/${ep.id}/edit`}
          className="text-xs text-[var(--muted)] hover:text-[var(--accent)]"
        >
          Edit episode →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10 mt-6 mb-12">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ep.coverUrl}
            alt={`Cover art for ${ep.title}`}
            className="w-full aspect-square rounded-lg object-cover bg-[var(--surface)] glow"
          />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)] mb-3">
            After Them · Episode {ep.number}
          </p>
          <h1 className="serif text-4xl md:text-5xl leading-[1.05] mb-4">
            {ep.title}
          </h1>
          <p className="text-[var(--muted)] text-sm mb-6">
            {fmtDuration(ep.durationSeconds)} · with {ep.guestName}
          </p>
          <p className="text-base leading-relaxed text-[var(--foreground)] whitespace-pre-line">
            {ep.description}
          </p>
        </div>
      </div>

      <EpisodePlayer
        audioUrl={ep.audioUrl}
        chapters={ep.chapters}
        title={ep.title}
      />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-10 mt-12">
        <section>
          <h2 className="serif text-2xl mb-4">Script</h2>
          <ScriptView script={ep.script} guestName={ep.guestName} />
        </section>

        <aside className="space-y-6">
          <section>
            <h3 className="text-xs uppercase tracking-[0.2em] text-[var(--muted)] mb-3">
              Show notes
            </h3>
            <div className="text-sm leading-relaxed prose-zinc whitespace-pre-line">
              {ep.showNotes}
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-[0.2em] text-[var(--muted)] mb-3">
              Download
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={ep.audioUrl}
                  download={`after-them-ep${ep.number}.mp3`}
                  className="text-[var(--accent)] hover:underline underline-offset-4"
                >
                  Audio (.mp3)
                </a>
              </li>
              <li>
                <a
                  href={ep.coverUrl}
                  download={`after-them-ep${ep.number}-cover.png`}
                  className="text-[var(--accent)] hover:underline underline-offset-4"
                >
                  Cover art (.png)
                </a>
              </li>
              <li>
                <a
                  href={`/api/episodes/${ep.id}/transcript`}
                  className="text-[var(--accent)] hover:underline underline-offset-4"
                >
                  Transcript (.txt)
                </a>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
