"use client";

import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import {
  DEMO_CRM_CLIENTS_COUNT,
  DEMO_CRM_DEALS,
  DEMO_CRM_PIPELINE,
} from "@/lib/demoDashboardData";
import { CrmSubNav } from "@/features/crm/components/CrmSubNav";
import { useClients } from "@/features/crm/hooks";
import { PipelineConversionPanel } from "@/features/deals/components/PipelineConversionPanel";
import { useDeals, usePipelineSummary } from "@/features/deals/hooks";

export default function CrmHubPage() {
  const { user } = useAuth();
  const clientsQuery = useClients();
  const dealsQuery = useDeals({ limit: 5 });
  const pipelineQuery = usePipelineSummary();
  const canCreate = user ? canPerformAction(user.role, "crm", "create") : false;

  const stages = pipelineQuery.data?.by_stage ?? pipelineQuery.data?.items ?? [];
  const realDeals = pipelineQuery.data?.total_count ?? stages.reduce((a, s) => a + (s.count ?? 0), 0);
  const realValue = pipelineQuery.data?.total_value ?? stages.reduce((a, s) => a + (s.value ?? 0), 0);
  const clientsCount = clientsQuery.data?.total ?? 0;
  const useDemo = !clientsQuery.isLoading && !pipelineQuery.isLoading && clientsCount === 0 && realDeals === 0;
  const totalDeals = useDemo ? DEMO_CRM_PIPELINE.total_count : realDeals;
  const totalValue = useDemo ? DEMO_CRM_PIPELINE.total_value : realValue;
  const pipelineSummary = useDemo ? DEMO_CRM_PIPELINE : pipelineQuery.data;
  const recentDeals = useDemo ? DEMO_CRM_DEALS : (dealsQuery.data?.items ?? []).slice(0, 5);

  return (
    <ProtectedLayout module="crm">
      <div className="space-y-6">
        <CrmSubNav />

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Revenue unifica clientes, pipeline comercial y analytics en un solo módulo. Punto de entrada para ventas y
            cuentas del workspace.
          </p>
          {useDemo ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
              Datos demo
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Clientes activos"
            loading={clientsQuery.isLoading}
            value={String(useDemo ? DEMO_CRM_CLIENTS_COUNT : clientsCount)}
          />
          <MetricCard label="Deals en pipeline" loading={pipelineQuery.isLoading} value={String(totalDeals)} />
          <MetricCard
            label="Valor pipeline (€)"
            loading={pipelineQuery.isLoading}
            value={totalValue > 0 ? totalValue.toLocaleString("es-ES", { maximumFractionDigits: 0 }) : "0"}
          />
          <MetricCard
            label="Tasa de cierre"
            loading={pipelineQuery.isLoading}
            value={useDemo ? "15.8%" : totalDeals > 0 ? "—" : "0%"}
            sub={useDemo ? "6 deals ganados / 38 totales" : undefined}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {canCreate ? (
            <>
              <Button asChild>
                <Link href="/crm/clients/new">Nuevo cliente</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/crm/deals/new">Nuevo deal</Link>
              </Button>
            </>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/crm/clients">Ver todos los clientes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/crm/deals">Ver pipeline completo</Link>
          </Button>
        </div>

        {clientsQuery.error instanceof ApiError && clientsQuery.error.status === 403 ? (
          <ForbiddenNotice>
            <p>No tienes acceso a Revenue en este workspace.</p>
          </ForbiddenNotice>
        ) : null}
        {clientsQuery.error && !(clientsQuery.error instanceof ApiError && clientsQuery.error.status === 403) ? (
          <ErrorNotice>
            <p>No pudimos cargar el resumen de clientes.</p>
          </ErrorNotice>
        ) : null}

        <PipelineConversionPanel
          error={useDemo ? undefined : (pipelineQuery.error ?? undefined)}
          isLoading={pipelineQuery.isLoading}
          summary={pipelineSummary}
        />

        {(recentDeals.length > 0 || useDemo) ? (
          <PanelCard>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Deals recientes</h2>
              <Link className="text-sm text-link hover:underline" href="/crm/deals">
                Ver todos
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-border">
              {recentDeals.map((deal) => (
                <li className="flex items-center justify-between py-2 text-sm" key={deal.id}>
                  {useDemo ? (
                    <span className="font-medium">{deal.title}</span>
                  ) : (
                    <Link className="font-medium text-link hover:underline" href={`/crm/deals/${deal.id}`}>
                      {deal.title}
                    </Link>
                  )}
                  <span className="text-muted-foreground">{deal.stage ?? "—"}</span>
                </li>
              ))}
            </ul>
          </PanelCard>
        ) : null}

        {dealsQuery.isLoading && !useDemo ? <SkeletonListRows rows={3} /> : null}
      </div>
    </ProtectedLayout>
  );
}

function MetricCard({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">
        {loading ? "…" : value}
      </p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
