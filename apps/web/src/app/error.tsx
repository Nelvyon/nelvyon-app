"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

import { NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-4 py-10">
      <NelvyonDsCard title="Algo salió mal">
        <p className="mb-6 text-sm text-muted-foreground">
          Ocurrió un error inesperado. Nuestro equipo fue notificado automáticamente.
        </p>
        <div className="flex flex-wrap gap-3">
          <NelvyonDsButton type="button" onClick={() => reset()}>
            Reintentar
          </NelvyonDsButton>
          <NelvyonDsButton asChild variant="secondary">
            <Link href="/">Volver al inicio</Link>
          </NelvyonDsButton>
        </div>
      </NelvyonDsCard>
    </main>
  );
}
