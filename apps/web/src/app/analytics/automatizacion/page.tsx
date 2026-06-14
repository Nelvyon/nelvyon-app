import { AnalyticsAutomatizacionClient } from "@/app/analytics/automatizacion/AnalyticsAutomatizacionClient";

export default function AnalyticsAutomatizacionPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Analytics de automatización: eventos por flujo, reglas CRM y tasa de éxito de jobs.
      </p>
      <AnalyticsAutomatizacionClient />
    </>
  );
}
