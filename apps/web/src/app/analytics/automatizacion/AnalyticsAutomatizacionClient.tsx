"use client";

import Link from "next/link";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import {
  AutomatizacionMetricCard,
  FlowEventsChart,
} from "@/features/automatizacion/components/AutomatizacionPanels";
import { AutomatizacionSubNav } from "@/features/automatizacion/components/AutomatizacionSubNav";
import { useAutomatizacionUnifiedReporting, useAutomatizacionWorkflows } from "@/features/automatizacion/hooks";
import { ReportingSubNav } from "@/features/reporting/components/ReportingSubNav";

export function AnalyticsAutomatizacionClient() {
  const unifiedQuery = useAutomatizacionUnifiedReporting();
  const workflowsQuery = useAutomatizacionWorkflows();
  const unified = unifiedQuery.data?.unified;
  const chartItems = (workflowsQuery.data?.items ?? [])
    .slice(0, 6)
    .map((w) => ({ name: w.name.slice(0, 12), runs: w.runs_count ?? 0 }));

  return (
    <ProtectedLayout module="automations">
      <div className="space-y-6">
        <ReportingSubNav />
        <AutomatizacionSubNav />

        {unifiedQuery.error ? (
          <ErrorNotice>
            <p>No pudimos cargar analytics de automatización.</p>
          </ErrorNotice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AutomatizacionMetricCard
            label="Eventos totales"
            loading={unifiedQuery.isLoading}
            value={String(unified?.total_runs ?? 0)}
          />
          <AutomatizacionMetricCard
            label="Flujos activos"
            loading={unifiedQuery.isLoading}
            value={String(unified?.active_flows ?? 0)}
          />
          <AutomatizacionMetricCard
            label="Ejecuciones reglas"
            loading={unifiedQuery.isLoading}
            value={String(unified?.rule_executions ?? 0)}
          />
          <AutomatizacionMetricCard
            label="Tasa éxito jobs"
            loading={unifiedQuery.isLoading}
            value={`${(unified?.success_rate ?? 0).toFixed(0)}%`}
          />
        </div>

        <PanelCard>
          <h2 className="text-base font-semibold">Eventos por flujo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuántas veces se ejecutó cada workflow visual del workspace.
          </p>
          <div className="mt-4">
            {workflowsQuery.isLoading ? (
              <SkeletonListRows rows={2} />
            ) : (
              <FlowEventsChart items={chartItems} />
            )}
          </div>
        </PanelCard>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/automatizacion/recetas">Usar receta</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/automatizacion/flujos">Ver flujos</Link>
          </Button>
        </div>
      </div>
    </ProtectedLayout>
  );
}
