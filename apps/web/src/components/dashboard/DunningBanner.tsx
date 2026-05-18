"use client";

import { NelvyonDsButton } from "@/design-system/components";
import { cn } from "@/core/ui/utils";

export type DunningBannerStatus = "grace" | "warning" | "suspended";

export interface DunningBannerProps {
  status: DunningBannerStatus;
  daysLeft?: number;
  updateUrl: string;
}

const STYLES: Record<DunningBannerStatus, { bar: string; message: string }> = {
  grace: {
    bar: "bg-amber-500/15 border-amber-500/40 text-amber-950 dark:text-amber-100",
    message: "Tu pago está pendiente. Actualiza tu método de pago.",
  },
  warning: {
    bar: "bg-orange-500/15 border-orange-500/40 text-orange-950 dark:text-orange-100",
    message: "Tu cuenta se suspende en {days} días.",
  },
  suspended: {
    bar: "bg-red-500/15 border-red-500/40 text-red-950 dark:text-red-100",
    message: "Tu cuenta está suspendida. Reactiva tu suscripción para continuar.",
  },
};

export function DunningBanner({ status, daysLeft, updateUrl }: DunningBannerProps) {
  const style = STYLES[status];
  const message =
    status === "warning" && typeof daysLeft === "number"
      ? style.message.replace("{days}", String(daysLeft))
      : style.message;

  const bar = (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        style.bar,
      )}
    >
      <p className="text-sm font-medium">{message}</p>
      <NelvyonDsButton
        variant={status === "suspended" ? "primary" : "secondary"}
        className="shrink-0"
        onClick={() => window.open(updateUrl, "_blank", "noopener,noreferrer")}
      >
        {status === "suspended" ? "Reactivar ahora" : "Actualizar pago"}
      </NelvyonDsButton>
    </div>
  );

  if (status !== "suspended") {
    return bar;
  }

  return (
    <>
      {bar}
      <div
        className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
        aria-hidden={false}
      >
        <div className="max-w-md rounded-lg border border-red-500/30 bg-card p-6 text-center shadow-lg">
          <p className="mb-4 text-base font-medium text-foreground">{message}</p>
          <NelvyonDsButton
            className="w-full"
            onClick={() => window.open(updateUrl, "_blank", "noopener,noreferrer")}
          >
            Reactivar ahora
          </NelvyonDsButton>
        </div>
      </div>
    </>
  );
}
