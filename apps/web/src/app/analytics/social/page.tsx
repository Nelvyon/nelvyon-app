import { AnalyticsSocialClient } from "@/app/analytics/social/AnalyticsSocialClient";

export default function AnalyticsSocialPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Analytics Social: alcance, engagement, sentimiento de marca y volumen de publicaciones.
      </p>
      <AnalyticsSocialClient />
    </>
  );
}
