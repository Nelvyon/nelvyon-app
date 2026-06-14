import { FunnelsHubClient } from "@/app/funnels/FunnelsHubClient";

export default function FunnelsHubPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Embudos de conversión: tráfico de publicidad, landing, captura de leads y cierre en CRM con métricas por paso.
      </p>
      <FunnelsHubClient />
    </>
  );
}
