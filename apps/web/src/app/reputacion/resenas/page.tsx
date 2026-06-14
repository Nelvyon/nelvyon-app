import { ResenasClient } from "@/app/reputacion/resenas/ResenasClient";

export default function ResenasPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Reseñas de Google Business con filtros por sentimiento y valoración.
      </p>
      <ResenasClient />
    </>
  );
}
