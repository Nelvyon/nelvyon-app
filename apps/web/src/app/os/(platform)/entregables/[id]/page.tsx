import { OsDeliverableDetailView } from "@/features/os-shell/deliverables/OsDeliverableDetailView";

export default async function EntregableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OsDeliverableDetailView deliverableId={id} />;
}
