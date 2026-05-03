import { listVoices } from "@/lib/elevenlabs";
import { getHostVoice } from "@/lib/host-config";
import { Wizard } from "./wizard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewEpisodePage() {
  const [voices, host] = await Promise.all([
    listVoices().catch(() => []),
    getHostVoice().catch(() => null),
  ]);

  if (!host?.voiceId) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <h1 className="serif text-3xl mb-4">First, pick Ada&rsquo;s voice</h1>
        <p className="text-[var(--muted)] mb-6">
          Ada hosts every episode and her voice has to stay consistent. Pick
          once and you&rsquo;ll never see this screen again.
        </p>
        <Link
          href="/settings"
          className="inline-block bg-[var(--accent)] text-black px-5 py-2.5 rounded-full text-sm font-medium"
        >
          Open settings
        </Link>
      </div>
    );
  }

  return <Wizard voices={voices} hostName={host.voiceName || "Ada"} />;
}
