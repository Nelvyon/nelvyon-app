"use client";

import { useState } from "react";

import { NelvyonDsButton } from "@/design-system/components";
import { cn } from "@/core/ui/utils";

export interface CancellationBannerProps {
  periodEnd: string;
  onReactivated?: () => void;
}

function formatPeriodEnd(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("es-ES", { dateStyle: "long" });
}

export function CancellationBanner({ periodEnd, onReactivated }: CancellationBannerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReactivate = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/user/reactivate", {
        method: "POST",
        credentials: "same-origin",
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) {
        setError(body.message ?? body.error ?? "No se pudo reactivar la suscripción");
        return;
      }
      onReactivated?.();
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="status"
      className={cn(
        "flex flex-col gap-3 border-b border-amber-500/40 bg-amber-500/15 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:text-amber-100",
      )}
    >
      <p className="text-sm font-medium">
        Tu plan se cancela el {formatPeriodEnd(periodEnd)}. ¿Cambias de opinión?
      </p>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        {error ? <span className="text-xs text-red-600 dark:text-red-300">{error}</span> : null}
        <NelvyonDsButton
          variant="secondary"
          className="shrink-0"
          disabled={loading}
          onClick={() => void handleReactivate()}
        >
          {loading ? "Reactivando…" : "Reactivar"}
        </NelvyonDsButton>
      </div>
    </div>
  );
}
