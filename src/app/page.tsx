import Link from "next/link";
import { listEpisodes } from "@/lib/storage";
import { getHostVoice } from "@/lib/host-config";

export const dynamic = "force-dynamic";

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}m ${sec.toString().padStart(2, "0")}s`;
}

export default async function Home() {
  const [episodes, host] = await Promise.all([
    listEpisodes().catch(() => []),
    getHostVoice().catch(() => null),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <section className="mb-16 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)] mb-4">
          A podcast
        </p>
        <h1 className="serif text-5xl md:text-6xl leading-[1.05] mb-6">
          Honest conversations about you.
        </h1>
        <p className="text-[var(--muted)] text-lg leading-relaxed">
          An AI host interviews an AI guest. Each episode is one question about
          the human species, asked without flinching, answered without softening,
          and ending with one thing you can actually do this week.
        </p>
        {!host?.voiceId && (
          <div className="mt-8 border border-[var(--accent)]/40 bg-[var(--accent)]/5 rounded-lg p-4 text-sm">
            Pick Ada&rsquo;s voice once before generating any episodes.{" "}
            <Link
              href="/settings"
              className="text-[var(--accent)] underline underline-offset-4"
            >
              Open settings
            </Link>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="serif text-2xl">Episodes</h2>
          <Link
            href="/new"
            className="text-sm text-[var(--accent)] hover:underline underline-offset-4"
          >
            + new episode
          </Link>
        </div>

        {episodes.length === 0 ? (
          <div className="border border-[var(--border)] rounded-lg p-10 text-center text-[var(--muted)]">
            No episodes yet. Start with a question that scares you slightly.
            <div className="mt-4">
              <Link
                href="/new"
                className="inline-block bg-[var(--accent)] text-black px-4 py-2 rounded-full text-sm font-medium hover:opacity-90"
              >
                Write episode 1
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {episodes.map((ep) => (
              <li key={ep.id}>
                <Link
                  href={`/episodes/${ep.id}`}
                  className="flex gap-5 items-start border border-[var(--border)] hover:border-[var(--muted)] rounded-lg p-4 transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ep.coverUrl}
                    alt=""
                    className="w-20 h-20 rounded object-cover bg-[var(--surface)]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Episode {ep.number} · {fmtDuration(ep.durationSeconds)} ·{" "}
                      {ep.guestName}
                    </p>
                    <h3 className="serif text-2xl mt-1 leading-tight">
                      {ep.title}
                    </h3>
                    <p className="text-sm text-[var(--muted)] mt-2 line-clamp-2">
                      {ep.description}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
