"use client";

import { useMemo } from "react";

import { NelvyonDsCard } from "@/design-system/components";

import { buildStageDistribution, hasCommercialPipelineData } from "../commercialDashboardUtils";
import { dealStageLabel, formatDealValue } from "../stages";
import type { SaasDealsMetrics } from "../types";

export function StageDistributionPanel({
  metrics,
  isLoading,
  error,
}: {
  metrics?: SaasDealsMetrics;
  isLoading?: boolean;
  error?: unknown;
}) {
  const rows = useMemo(
    () => (metrics ? buildStageDistribution(metrics, dealStageLabel) : []),
    [metrics],
  );

  if (isLoading) {
    return (
      <NelvyonDsCard title="Distribución por etapa">
        <p className="text-sm text-muted-foreground">Cargando distribución del pipeline…</p>
      </NelvyonDsCard>
    );
  }

  if (error) {
    return (
      <NelvyonDsCard title="Distribución por etapa">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "No se pudo cargar la distribución."}
        </p>
      </NelvyonDsCard>
    );
  }

  if (!metrics || !hasCommercialPipelineData(metrics)) {
    return (
      <NelvyonDsCard title="Distribución por etapa">
        <p className="text-sm text-muted-foreground">
          Aún no hay deals en el pipeline. Crea oportunidades en el CRM para ver la distribución por etapa.
        </p>
      </NelvyonDsCard>
    );
  }

  const currency = metrics.currency || "EUR";
  const maxCount = Math.max(...rows.map((r) => r.count), 1);

  return (
    <NelvyonDsCard title="Distribución por etapa">
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.stage} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-foreground">{row.label}</span>
              <span className="text-muted-foreground">
                {row.count} · {formatDealValue(row.totalValue, currency)} · {row.sharePct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.max((row.count / maxCount) * 100, row.count > 0 ? 4 : 0)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </NelvyonDsCard>
  );
}
