import { AnalyticsReputacionClient } from "@/app/analytics/reputacion/AnalyticsReputacionClient";

export default function AnalyticsReputacionPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Analytics de reputación: sentimiento, alertas y evolución de reseñas Google Business.
      </p>
      <AnalyticsReputacionClient />
    </>
  );
}
