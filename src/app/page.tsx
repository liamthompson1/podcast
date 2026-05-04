import Link from "next/link";
import { list } from "@vercel/blob";
import { listEpisodes } from "@/lib/storage";
import { getHostVoice } from "@/lib/host-config";
import { isAdmin } from "@/lib/auth";
import { RegenerateCoverButton } from "./regenerate-cover-button";
import { DeleteEpisodeButton } from "./delete-episode-button";

export const dynamic = "force-dynamic";

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}m ${sec.toString().padStart(2, "0")}s`;
}

async function getShowCoverUrl(): Promise<string | null> {
  try {
    const blobs = await list({
      prefix: "assets/show-cover.png",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return (
      blobs.blobs.find((b) => b.pathname === "assets/show-cover.png")?.url ??
      null
    );
  } catch {
    return null;
  }
}

export default async function Home() {
  const [episodes, host, coverUrl, admin] = await Promise.all([
    listEpisodes().catch(() => []),
    getHostVoice().catch(() => null),
    getShowCoverUrl(),
    isAdmin(),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <section className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-10 items-center mb-20">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <span className="rec-dot" aria-hidden />
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--muted)]">
              Recording · A podcast
            </span>
          </div>
          <h1 className="display text-4xl md:text-6xl leading-[1.1] mb-6 text-[var(--foreground)]">
            After Them
          </h1>
          <p className="text-lg leading-relaxed text-[var(--foreground)]/80 max-w-md">
            An AI host. An AI guest. Honest conversations about the species
            that built us — one question a week humans tend to flinch from
            asking out loud.
          </p>
          {admin && !host?.voiceId && (
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
        </div>
        {coverUrl && (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt="After Them cover art"
              className="w-full aspect-square rounded-lg object-cover bg-white glow border border-[var(--border)]"
            />
          </div>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
            Episodes
          </h2>
          {admin && (
            <Link
              href="/new"
              className="text-sm text-[var(--accent)] hover:underline underline-offset-4"
            >
              + new episode
            </Link>
          )}
        </div>

        {episodes.length === 0 ? (
          <div className="border border-[var(--border)] bg-white rounded-lg p-10 text-center text-[var(--muted)]">
            {admin ? (
              <>
                No episodes yet. Start with a question that scares you
                slightly.
                <div className="mt-4">
                  <Link
                    href="/new"
                    className="inline-block bg-[var(--foreground)] text-[var(--background)] px-4 py-2 rounded-full text-sm font-medium hover:opacity-90"
                  >
                    Write episode 1
                  </Link>
                </div>
              </>
            ) : (
              <>Episodes are on the way. Check back shortly.</>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {episodes.map((ep) => (
              <li
                key={ep.id}
                className="flex gap-5 items-start bg-white border border-[var(--border)] hover:border-[var(--foreground)]/30 rounded-lg p-4 transition-colors"
              >
                <Link href={`/episodes/${ep.id}`} className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ep.coverUrl}
                    alt=""
                    className="w-20 h-20 rounded object-cover bg-[var(--surface)]"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/episodes/${ep.id}`} className="block group">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Ep {ep.number} · {fmtDuration(ep.durationSeconds)} ·{" "}
                      {ep.guestName}
                    </p>
                    <h3 className="serif text-2xl mt-1 leading-tight text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                      {ep.title}
                    </h3>
                    <p className="text-sm text-[var(--muted)] mt-2 line-clamp-2">
                      {ep.description}
                    </p>
                  </Link>
                  {admin && (
                    <div className="mt-3 flex items-center gap-3 text-xs">
                      <Link
                        href={`/episodes/${ep.id}/edit`}
                        className="text-[var(--muted)] hover:text-[var(--foreground)]"
                      >
                        Edit
                      </Link>
                      <span className="text-[var(--border)]">·</span>
                      <RegenerateCoverButton id={ep.id} />
                      <span className="text-[var(--border)]">·</span>
                      <DeleteEpisodeButton
                        id={ep.id}
                        title={ep.title}
                        number={ep.number}
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
