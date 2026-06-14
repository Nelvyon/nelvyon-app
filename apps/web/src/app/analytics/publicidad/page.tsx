import { AnalyticsPublicidadClient } from "@/app/analytics/publicidad/AnalyticsPublicidadClient";

export default function AnalyticsPublicidadPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Analytics de publicidad: inversión, ROAS combinado y alertas de rendimiento por plataforma.
      </p>
      <AnalyticsPublicidadClient />
    </>
  );
}
