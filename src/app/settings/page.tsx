import { listVoices } from "@/lib/elevenlabs";
import { getHostVoice } from "@/lib/host-config";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [voices, host] = await Promise.all([
    listVoices().catch(() => []),
    getHostVoice().catch(() => null),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)] mb-3">
        Settings
      </p>
      <h1 className="serif text-4xl mb-3">Ada&rsquo;s voice</h1>
      <p className="text-[var(--muted)] mb-8 leading-relaxed">
        Ada hosts every episode. Pick a voice once and lock it in — consistency
        is the whole point. Preview each one before committing.
      </p>
      <SettingsForm voices={voices} current={host} />
    </div>
  );
}
