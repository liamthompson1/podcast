import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminLogin } from "./admin-login";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (await isAdmin()) {
    redirect(next || "/");
  }
  return (
    <div className="max-w-sm mx-auto px-6 py-24">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)] mb-3">
        Studio
      </p>
      <h1 className="serif text-3xl mb-6">Sign in</h1>
      <AdminLogin nextPath={next || "/"} />
    </div>
  );
}
