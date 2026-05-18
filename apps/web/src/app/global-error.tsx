"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

import { NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";

export default function GlobalError({
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
    <html lang="es">
      <body className="bg-background text-foreground">
        <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10">
          <NelvyonDsCard title="Error crítico">
            <p className="mb-6 text-sm text-muted-foreground">
              Se produjo un error global inesperado. El incidente fue reportado automáticamente.
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
      </body>
    </html>
  );
}
