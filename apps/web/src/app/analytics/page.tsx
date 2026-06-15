import { AnalyticsHubClient } from "@/app/analytics/AnalyticsHubClient";

export default function AnalyticsHubPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Centro de analítica unificado. Instantáneas de Publicidad, Social, Embudos y Ecommerce por módulo.
      </p>
      <AnalyticsHubClient />
    </>
  );
}
