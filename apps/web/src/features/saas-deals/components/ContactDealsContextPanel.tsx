"use client";

import { NelvyonDsBadge, NelvyonDsStatusDot } from "@/design-system/components";

import type { ContactDealsContext } from "../types";
import { dealStageLabel, formatDealValue } from "../stages";

export function ContactDealsContextPanel({
  dealsContext,
  isLoading,
  error,
}: {
  dealsContext?: ContactDealsContext | null;
  isLoading?: boolean;
  error?: unknown;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Oportunidades</h4>
        <p className="text-sm text-muted-foreground">Cargando deals del contacto…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Oportunidades</h4>
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "No se pudo cargar el contexto de deals."}
        </p>
      </div>
    );
  }

  if (!dealsContext) return null;

  const { dealCount, totalValue, primaryStage, deals, recentActivities } = dealsContext;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Oportunidades</h4>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {dealCount} deal{dealCount === 1 ? "" : "s"} · {formatDealValue(totalValue)}
          </span>
          {primaryStage ? (
            <NelvyonDsBadge tone="primary">Etapa principal: {dealStageLabel(primaryStage)}</NelvyonDsBadge>
          ) : null}
        </div>
      </div>

      {deals.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin oportunidades vinculadas a este contacto.</p>
      ) : (
        <ul className="space-y-2">
          {deals.map((deal) => (
            <li key={deal.id} className="rounded-md border border-border bg-muted/30 p-2 text-sm">
              <p className="font-medium text-foreground">{deal.title}</p>
              <p className="text-muted-foreground">
                {dealStageLabel(deal.stage)} · {formatDealValue(deal.value, deal.currency)} · {deal.probability}%
              </p>
            </li>
          ))}
        </ul>
      )}

      {recentActivities.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Actividad reciente (deals)</h4>
          <ul className="space-y-2">
            {recentActivities.map((a) => (
              <li key={a.id} className="flex items-start gap-2 text-sm">
                <NelvyonDsStatusDot status="ok" label={a.activityType} />
                <div>
                  <p className="font-medium text-foreground">{a.description}</p>
                  <p className="text-muted-foreground">
                    {a.activityType} · {new Date(a.createdAt).toLocaleString("es-ES")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
