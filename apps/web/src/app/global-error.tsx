"use client";

import Link from "next/link";

import { NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (typeof window !== "undefined") {
    console.error("[nelvyon] global-error", error.message, error.digest);
  }

  return (
    <html lang="es">
      <body className="bg-background text-foreground">
        <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10">
          <NelvyonDsCard title="Error crítico">
            <p className="mb-6 text-sm text-muted-foreground">
              Se produjo un error global inesperado.
              {error.digest ? (
                <span className="mt-2 block font-mono text-xs text-zinc-500">Ref: {error.digest}</span>
              ) : null}
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
