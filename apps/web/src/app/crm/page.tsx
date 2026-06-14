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
  const totalDeals = pipelineQuery.data?.total_count ?? stages.reduce((a, s) => a + (s.count ?? 0), 0);
  const totalValue = pipelineQuery.data?.total_value ?? stages.reduce((a, s) => a + (s.value ?? 0), 0);

  return (
    <ProtectedLayout module="crm">
      <div className="space-y-6">
        <CrmSubNav />

        <p className="text-sm text-muted-foreground">
          Revenue unifica clientes, pipeline comercial y analytics en un solo módulo. Punto de entrada para ventas y
          cuentas del workspace.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Clientes activos" loading={clientsQuery.isLoading} value={String(clientsQuery.data?.total ?? 0)} />
          <MetricCard label="Deals en pipeline" loading={pipelineQuery.isLoading} value={String(totalDeals)} />
          <MetricCard
            label="Valor pipeline (€)"
            loading={pipelineQuery.isLoading}
            value={totalValue > 0 ? totalValue.toLocaleString("es-ES", { maximumFractionDigits: 0 }) : "0"}
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
          error={pipelineQuery.error ?? undefined}
          isLoading={pipelineQuery.isLoading}
          summary={pipelineQuery.data}
        />

        {dealsQuery.data && dealsQuery.data.items.length > 0 ? (
          <PanelCard>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Deals recientes</h2>
              <Link className="text-sm text-link hover:underline" href="/crm/deals">
                Ver todos
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-border">
              {dealsQuery.data.items.slice(0, 5).map((deal) => (
                <li className="flex items-center justify-between py-2 text-sm" key={deal.id}>
                  <Link className="font-medium text-link hover:underline" href={`/crm/deals/${deal.id}`}>
                    {deal.title}
                  </Link>
                  <span className="text-muted-foreground">{deal.stage ?? "—"}</span>
                </li>
              ))}
            </ul>
          </PanelCard>
        ) : null}

        {dealsQuery.isLoading ? <SkeletonListRows rows={3} /> : null}
      </div>
    </ProtectedLayout>
  );
}

function MetricCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">
        {loading ? "…" : value}
      </p>
    </div>
  );
}
