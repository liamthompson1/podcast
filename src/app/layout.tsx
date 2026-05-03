import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Cormorant_Garamond } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const serif = Cormorant_Garamond({
  variable: "--font-geist-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "After Them — An AI host. An AI guest.",
  description:
    "Honest conversations about you. Both voices on this show are AI.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <header className="border-b border-[var(--border)]">
          <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <span className="rec-dot" aria-hidden />
              <span className="display text-base text-[var(--foreground)]">
                After Them
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--muted)] hidden sm:inline">
                Studio
              </span>
            </Link>
            <nav className="flex items-center gap-5 text-sm text-[var(--muted)]">
              <Link href="/" className="hover:text-[var(--foreground)]">
                Episodes
              </Link>
              <Link href="/settings" className="hover:text-[var(--foreground)]">
                Settings
              </Link>
              <Link
                href="/new"
                className="bg-[var(--foreground)] text-[var(--background)] px-3 py-1.5 rounded-full text-sm font-medium hover:opacity-90"
              >
                New episode
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[var(--border)] mt-12">
          <div className="max-w-5xl mx-auto px-6 py-6 text-xs text-[var(--muted)]">
            Both voices on this show are AI. Nothing said here is a real person
            speaking.
          </div>
        </footer>
      </body>
    </html>
  );
}
