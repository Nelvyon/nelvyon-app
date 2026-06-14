import { AlertasClient } from "@/app/reputacion/alertas/AlertasClient";

export default function AlertasPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Alertas de reputación: avisos inmediatos ante nuevas reseñas negativas en Google Business.
      </p>
      <AlertasClient />
    </>
  );
}
