import { notFound } from "next/navigation";
import { getManifest } from "@/lib/storage";
import { EditForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditEpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ep = await getManifest(id);
  if (!ep) notFound();
  return <EditForm episode={ep} />;
}
