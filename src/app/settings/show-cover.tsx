"use client";

import { useEffect, useRef, useState } from "react";
import { readResultStream } from "@/lib/client-stream";

export function ShowCover() {
  const [url, setUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressMs, setProgressMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/show/cover")
      .then((r) => r.json())
      .then((d) => setUrl(d.url ? `${d.url}?t=${Date.now()}` : null))
      .catch(() => {});
  }, []);

  async function generate() {
    setGenerating(true);
    setError(null);
    setProgressMs(0);
    try {
      const res = await fetch("/api/show/cover", { method: "POST" });
      const data = await readResultStream<{ url: string }>(res, setProgressMs);
      setUrl(data.url + `?t=${Date.now()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
    } finally {
      setGenerating(false);
    }
  }

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/show/cover/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "upload failed");
      setUrl(data.url + `?t=${Date.now()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <section className="mt-12 pt-10 border-t border-[var(--border)]">
      <h2 className="serif text-2xl mb-2">Show cover</h2>
      <p className="text-[var(--muted)] mb-6 leading-relaxed">
        The single piece of art that represents the whole show on Apple
        Podcasts, Spotify, and everywhere else. Generated at 2048&times;2048 —
        clears Apple&rsquo;s 1400&times;1400 minimum and is square as required.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 items-start">
        <div>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Show cover"
              className="w-full aspect-square rounded-lg object-cover bg-[var(--surface)] glow"
            />
          ) : (
            <div className="w-full aspect-square rounded-lg border border-dashed border-[var(--border)] flex items-center justify-center text-xs text-[var(--muted)]">
              No cover yet
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || generating}
              className="bg-[var(--foreground)] text-[var(--background)] px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 disabled:opacity-40"
            >
              {uploading ? "Uploading…" : "Upload cover"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
              }}
            />
            <button
              onClick={generate}
              disabled={generating || uploading}
              className="border border-[var(--border)] bg-white text-[var(--foreground)] px-5 py-2.5 rounded-full text-sm font-medium hover:border-[var(--foreground)]/30 disabled:opacity-40"
            >
              {generating
                ? `Generating… ${Math.round(progressMs / 1000)}s`
                : url
                  ? "Regenerate via AI"
                  : "Generate via AI"}
            </button>

            {url && !generating && !uploading && (
              <a
                href={url}
                download="after-them-cover.png"
                className="text-sm text-[var(--accent)] hover:underline underline-offset-4"
              >
                Download
              </a>
            )}
          </div>

          <p className="text-xs text-[var(--muted)] mt-4 max-w-md leading-relaxed">
            Upload a PNG or JPEG (3000&times;3000 ideal, 1400&times;1400
            minimum) to use your own design. Or generate one in the show&rsquo;s
            visual style — sunlit white studio, black mic, single red light.
            Each AI generation takes 20&ndash;40 seconds.
          </p>

          {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
        </div>
      </div>
    </section>
  );
}
