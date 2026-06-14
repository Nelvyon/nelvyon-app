import { AnalyticsFunnelsClient } from "@/app/analytics/funnels/AnalyticsFunnelsClient";

export default function AnalyticsFunnelsPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Analytics de embudos: conversión por paso y por campaña, integrado con CRM y Publicidad.
      </p>
      <AnalyticsFunnelsClient />
    </>
  );
}
