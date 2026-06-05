"use client";

import Link from "next/link";

import { NelvyonDsButton, NelvyonDsSectionHeader } from "@/design-system/components";

import { useSaasDealMetrics, useSaasDeals } from "../hooks";
import { hasCommercialPipelineData } from "../commercialDashboardUtils";
import { CommercialActivityPanels } from "./CommercialActivityPanels";
import { CommercialKpiRow } from "./CommercialKpiRow";
import { StageDistributionPanel } from "./StageDistributionPanel";

export function CommercialPipelineSection() {
  const metricsQuery = useSaasDealMetrics();
  const dealsQuery = useSaasDeals();

  const metrics = metricsQuery.data?.metrics;
  const hasData = metrics ? hasCommercialPipelineData(metrics) : false;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <NelvyonDsSectionHeader
          eyebrow="Pipeline comercial"
          title="Ventas y oportunidades"
          subtitle="Métricas oficiales del tenant basadas en saas_deals."
        />
        <NelvyonDsButton asChild>
          <Link href="/saas/crm?tab=pipeline">Abrir pipeline en CRM</Link>
        </NelvyonDsButton>
      </div>

      {!metricsQuery.isLoading && !metricsQuery.error && metrics && !hasData ? (
        <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Tu pipeline comercial está vacío. Crea el primer deal desde el CRM para ver KPIs, distribución por etapa y
          actividad de ventas aquí.
        </div>
      ) : null}

      <CommercialKpiRow
        metrics={metrics}
        isLoading={metricsQuery.isLoading}
        error={metricsQuery.error}
      />

      <StageDistributionPanel
        metrics={metrics}
        isLoading={metricsQuery.isLoading}
        error={metricsQuery.error}
      />

      <CommercialActivityPanels
        deals={dealsQuery.data?.deals}
        isLoading={dealsQuery.isLoading}
        error={dealsQuery.error}
      />
    </section>
  );
}
