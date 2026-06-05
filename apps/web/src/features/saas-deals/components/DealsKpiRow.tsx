"use client";

import { NelvyonDsCard } from "@/design-system/components";

import type { SaasDealsMetrics } from "../types";
import { formatDealValue } from "../stages";

type KpiItem = {
  label: string;
  value: string;
};

function buildKpis(metrics: SaasDealsMetrics): KpiItem[] {
  const currency = metrics.currency || "EUR";
  return [
    { label: "Deals abiertos", value: String(metrics.openCount) },
    { label: "Ganados", value: String(metrics.wonCount) },
    { label: "Perdidos", value: String(metrics.lostCount) },
    { label: "Pipeline", value: formatDealValue(metrics.pipelineValue, currency) },
    { label: "Forecast", value: formatDealValue(metrics.forecastValue, currency) },
  ];
}

export function DealsKpiRow({
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
      <NelvyonDsCard title="KPIs de ventas">
        <p className="text-sm text-muted-foreground">Cargando métricas del pipeline…</p>
      </NelvyonDsCard>
    );
  }

  if (error) {
    return (
      <NelvyonDsCard title="KPIs de ventas">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "No se pudieron cargar las métricas."}
        </p>
      </NelvyonDsCard>
    );
  }

  if (!metrics) return null;

  const items = buildKpis(metrics);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <NelvyonDsCard key={item.label} title={item.label}>
          <p className="text-xl font-semibold text-foreground">{item.value}</p>
        </NelvyonDsCard>
      ))}
    </div>
  );
}
