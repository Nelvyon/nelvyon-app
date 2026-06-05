"use client";

import { NelvyonDsCard } from "@/design-system/components";

import type { SaasDealsMetrics } from "../types";
import { formatDealValue } from "../stages";

type KpiItem = { label: string; value: string };

function buildCommercialKpis(metrics: SaasDealsMetrics): KpiItem[] {
  const currency = metrics.currency || "EUR";
  return [
    { label: "Deals activos", value: String(metrics.openCount) },
    { label: "Deals ganados", value: String(metrics.wonCount) },
    { label: "Deals perdidos", value: String(metrics.lostCount) },
    { label: "Pipeline abierto", value: formatDealValue(metrics.pipelineValue, currency) },
    { label: "Forecast", value: formatDealValue(metrics.forecastValue, currency) },
    { label: "Valor ganado", value: formatDealValue(metrics.wonValue, currency) },
  ];
}

export function CommercialKpiRow({
  metrics,
  isLoading,
  error,
}: {
  metrics?: SaasDealsMetrics;
  isLoading?: boolean;
  error?: unknown;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <NelvyonDsCard key={i} title="Cargando…">
            <p className="text-sm text-muted-foreground">—</p>
          </NelvyonDsCard>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <NelvyonDsCard title="KPIs comerciales">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "No se pudieron cargar las métricas comerciales."}
        </p>
      </NelvyonDsCard>
    );
  }

  if (!metrics) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {buildCommercialKpis(metrics).map((item) => (
        <NelvyonDsCard key={item.label} title={item.label}>
          <p className="text-xl font-semibold text-foreground">{item.value}</p>
        </NelvyonDsCard>
      ))}
    </div>
  );
}
