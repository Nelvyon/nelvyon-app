import { OsDealDetailView } from "@/features/os-shell/pipeline/OsDealDetailView";

export const metadata = {
  title: "Oportunidad · NELVYON OS",
};

export default async function OsPipelineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OsDealDetailView dealId={Number(id)} />;
}
