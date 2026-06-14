"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { CrmSubNav } from "@/features/crm/components/CrmSubNav";
import { DealsAtRiskPanel } from "@/features/deals/components/DealsAtRiskPanel";
import { DealsList } from "@/features/deals/components/DealsList";
import { PipelineConversionPanel } from "@/features/deals/components/PipelineConversionPanel";
import { useDeals, usePipelineSummary } from "@/features/deals/hooks";

export default function RevenueAnalyticsPage() {
  const [stageFilter, setStageFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const dealsQuery = useDeals({ stage: stageFilter, owner: ownerFilter });
  const analyticsQuery = usePipelineSummary();

  const owners = useMemo(() => {
    const rows = dealsQuery.data?.items ?? [];
    return [...new Set(rows.map((row) => row.assigned_to).filter(Boolean))] as string[];
  }, [dealsQuery.data]);

  const listEmptyContext = useMemo(() => {
    if (stageFilter !== "all" || ownerFilter !== "all") return "filters" as const;
    return "default" as const;
  }, [stageFilter, ownerFilter]);

  const dealsHref = useMemo(() => {
    const params = new URLSearchParams();
    if (stageFilter !== "all") params.set("stage", stageFilter);
    if (ownerFilter !== "all") params.set("owner", ownerFilter);
    const query = params.toString();
    return query ? `/crm/deals?${query}` : "/crm/deals";
  }, [ownerFilter, stageFilter]);

  return (
    <ProtectedLayout module="crm">
      <div className="space-y-5">
        <CrmSubNav />
        <p className="text-sm text-muted-foreground">
          Analytics de Revenue: pipeline actual, conversión por etapa y deals en riesgo. Datos en tiempo real del
          workspace activo.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filtrar por etapa"
              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              onChange={(e) => setStageFilter(e.target.value)}
              value={stageFilter}
            >
              <option value="all">Todas las etapas</option>
              <option value="lead">Lead</option>
              <option value="qualified">Calificado</option>
              <option value="proposal">Propuesta</option>
              <option value="negotiation">Negociación</option>
              <option value="won">Ganado</option>
              <option value="lost">Perdido</option>
            </select>
            <select
              aria-label="Filtrar por responsable"
              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              onChange={(e) => setOwnerFilter(e.target.value)}
              value={ownerFilter}
            >
              <option value="all">Todos los responsables</option>
              {owners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link className="text-link underline" href="/analytics/revenue/deals">
              Detalle por deal
            </Link>
            <Link className="text-link underline" href={dealsHref}>
              Pipeline con filtros
            </Link>
            <Link className="text-link underline" href="/crm/deals">
              Ver pipeline completo
            </Link>
          </div>
        </div>

        {dealsQuery.isLoading ? <SkeletonListRows aria-label="Cargando analytics" rows={6} /> : null}
        {dealsQuery.isFetching && dealsQuery.data ? (
          <p className="text-xs text-muted-foreground">Actualizando analytics…</p>
        ) : null}

        {dealsQuery.error instanceof ApiError && dealsQuery.error.status === 403 ? (
          <ForbiddenNotice>
            <p>No tienes acceso a analytics CRM en este workspace.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Cambia de workspace o pide permisos a un administrador.
            </p>
          </ForbiddenNotice>
        ) : null}

        {dealsQuery.error && !(dealsQuery.error instanceof ApiError && dealsQuery.error.status === 403) ? (
          <ErrorNotice>
            <p>No pudimos cargar los datos de analytics. Inténtalo de nuevo.</p>
          </ErrorNotice>
        ) : null}

        <PipelineConversionPanel
          error={analyticsQuery.error ?? undefined}
          isLoading={analyticsQuery.isLoading}
          summary={analyticsQuery.data}
        />

        {dealsQuery.data ? <DealsAtRiskPanel deals={dealsQuery.data.items} /> : null}
        {dealsQuery.data ? <DealsList deals={dealsQuery.data.items} emptyContext={listEmptyContext} /> : null}
      </div>
    </ProtectedLayout>
  );
}
