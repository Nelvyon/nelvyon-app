"use client";

import { DarkCard } from "@/features/saas-shell/components/SaasShellLayout";
import { KpiTile, SaasWidgetHeader } from "@/features/saas-shell/components/SaasDashboardWidgets";

import type { SaasDealsMetrics } from "../types";
import { formatDealValue } from "../stages";

type KpiItem = { label: string; value: string; icon: string; accent?: boolean };

function buildCommercialKpis(metrics: SaasDealsMetrics): KpiItem[] {
  const currency = metrics.currency || "EUR";
  return [
    { label: "Deals activos", value: String(metrics.openCount), icon: "📋" },
    { label: "Deals ganados", value: String(metrics.wonCount), icon: "🏆" },
    { label: "Deals perdidos", value: String(metrics.lostCount), icon: "📉" },
    { label: "Pipeline abierto", value: formatDealValue(metrics.pipelineValue, currency), icon: "💼", accent: true },
    { label: "Forecast", value: formatDealValue(metrics.forecastValue, currency), icon: "🔮" },
    { label: "Valor ganado", value: formatDealValue(metrics.wonValue, currency), icon: "💰" },
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
          <DarkCard key={i}>
            <p className="text-sm text-white/30">Cargando…</p>
          </DarkCard>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <DarkCard>
        <SaasWidgetHeader title="KPIs comerciales" />
        <p className="text-sm text-red-400">
          {error instanceof Error ? error.message : "No se pudieron cargar las métricas comerciales."}
        </p>
      </DarkCard>
    );
  }

  if (!metrics) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {buildCommercialKpis(metrics).map((item) => (
        <KpiTile key={item.label} icon={item.icon} label={item.label} value={item.value} accent={item.accent} />
      ))}
    </div>
  );
}
