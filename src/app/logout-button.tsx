"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={go}
      disabled={busy}
      className="text-xs text-[var(--muted)] hover:text-red-500"
    >
      {busy ? "…" : "Sign out"}
    </button>
  );
}
