import { FunnelDetailClient } from "@/app/funnels/[id]/FunnelDetailClient";

export default function FunnelDetailPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Detalle del embudo: conversión por paso, abandono y atribución a campaña y CRM.
      </p>
      <FunnelDetailClient />
    </>
  );
}
