import { ReputacionHubClient } from "@/app/reputacion/ReputacionHubClient";

export default function ReputacionHubPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Reputación online: reseñas de Google Business, sentimiento, alertas negativas y widgets para tu web.
      </p>
      <ReputacionHubClient />
    </>
  );
}
