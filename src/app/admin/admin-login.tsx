"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLogin({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Wrong password.");
        setBusy(false);
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Login failed.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-xs uppercase tracking-[0.2em] text-[var(--muted)] mb-1.5">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="w-full bg-white border border-[var(--border)] rounded-md px-3 py-2.5 text-base"
        />
      </div>
      <button
        type="submit"
        disabled={busy || !password}
        className="bg-[var(--foreground)] text-[var(--background)] px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 disabled:opacity-40 w-full"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}
