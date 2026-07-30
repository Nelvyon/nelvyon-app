"use client";

import { DarkCard } from "@/features/saas-shell/components/SaasShellLayout";
import { KpiTile, SaasWidgetHeader } from "@/features/saas-shell/components/SaasDashboardWidgets";

import type { SaasDealsMetrics } from "../types";
import { formatDealValue } from "../stages";

type KpiItem = {
  label: string;
  value: string;
  icon: string;
  accent?: boolean;
};

function buildKpis(metrics: SaasDealsMetrics): KpiItem[] {
  const currency = metrics.currency || "EUR";
  return [
    { label: "Deals abiertos", value: String(metrics.openCount), icon: "📋" },
    { label: "Ganados", value: String(metrics.wonCount), icon: "🏆" },
    { label: "Perdidos", value: String(metrics.lostCount), icon: "📉" },
    { label: "Pipeline", value: formatDealValue(metrics.pipelineValue, currency), icon: "💼", accent: true },
    { label: "Forecast", value: formatDealValue(metrics.forecastValue, currency), icon: "🔮" },
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
      <DarkCard>
        <SaasWidgetHeader title="KPIs de ventas" />
        <p className="text-sm text-white/40">Cargando métricas del pipeline…</p>
      </DarkCard>
    );
  }

  if (error) {
    return (
      <DarkCard>
        <SaasWidgetHeader title="KPIs de ventas" />
        <p className="text-sm text-red-400">
          {error instanceof Error ? error.message : "No se pudieron cargar las métricas."}
        </p>
      </DarkCard>
    );
  }

  if (!metrics) return null;

  const items = buildKpis(metrics);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <KpiTile key={item.label} icon={item.icon} label={item.label} value={item.value} accent={item.accent} />
      ))}
    </div>
  );
}
