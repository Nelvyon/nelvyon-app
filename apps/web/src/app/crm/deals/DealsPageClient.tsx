"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Button } from "@/core/ui/button";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { CrmSubNav } from "@/features/crm/components/CrmSubNav";
import { useClient } from "@/features/crm/hooks";
import { DealsAtRiskPanel } from "@/features/deals/components/DealsAtRiskPanel";
import { DealsList } from "@/features/deals/components/DealsList";
import { PipelineConversionPanel } from "@/features/deals/components/PipelineConversionPanel";
import { useDeals, usePipelineSummary } from "@/features/deals/hooks";

function parseClientId(raw: string | null): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const n = Number(raw);
  return n > 0 ? n : undefined;
}

export function DealsPageClient() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const clientId = parseClientId(searchParams?.get("client_id") ?? null);
  const canEdit = user ? canPerformAction(user.role, "crm", "edit") : false;
  const [stageFilter, setStageFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const dealsQuery = useDeals({ stage: stageFilter, owner: ownerFilter, clientId });
  const analyticsQuery = usePipelineSummary();
  const clientQuery = useClient(clientId ?? 0);

  const owners = useMemo(() => {
    const all = dealsQuery.data?.items ?? [];
    return [...new Set(all.map((row) => row.assigned_to).filter(Boolean))] as string[];
  }, [dealsQuery.data]);

  const listEmptyContext = useMemo(() => {
    if (clientId != null) return "client-filter" as const;
    if (stageFilter !== "all" || ownerFilter !== "all") return "filters" as const;
    return "default" as const;
  }, [clientId, stageFilter, ownerFilter]);

  return (
    <ProtectedLayout module="crm">
      <div className="space-y-5">
        <CrmSubNav />

        {clientId != null ? (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm shadow-card">
            <p className="font-medium text-foreground">Pipeline filtrado por cliente</p>
            <p className="mt-1 text-muted-foreground">
              Cliente{" "}
              {clientQuery.data?.business_name ? (
                <strong>{clientQuery.data.business_name}</strong>
              ) : clientQuery.isLoading ? (
                <span>cargando…</span>
              ) : (
                <strong>#{clientId}</strong>
              )}
              .{" "}
              <Link className="text-link underline-offset-2 hover:underline" href={`/crm/clients/${clientId}`}>
                Ver ficha
              </Link>
              {" · "}
              <Link className="text-link underline-offset-2 hover:underline" href="/crm/deals">
                Quitar filtro
              </Link>
            </p>
          </div>
        ) : null}

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
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button asChild>
                <Link href={clientId ? `/crm/deals/new?client_id=${clientId}` : "/crm/deals/new"}>
                  Nuevo deal
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        {!canEdit ? (
          <p className="text-sm text-warning-foreground">
            Tu rol puede consultar el pipeline; editar etapa y responsable requiere permisos de operador.
          </p>
        ) : null}

        {dealsQuery.isLoading ? <SkeletonListRows aria-label="Cargando deals" rows={7} /> : null}
        {dealsQuery.isFetching && dealsQuery.data ? (
          <p className="text-xs text-muted-foreground">Actualizando pipeline…</p>
        ) : null}
        {dealsQuery.error instanceof ApiError && dealsQuery.error.status === 403 ? (
          <ForbiddenNotice>
            <p>No tienes acceso a deals en este workspace.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Cambia de workspace o pide permisos CRM a un administrador.
            </p>
          </ForbiddenNotice>
        ) : null}
        {dealsQuery.error && !(dealsQuery.error instanceof ApiError && dealsQuery.error.status === 403) ? (
          <ErrorNotice>
            <p>No pudimos cargar el pipeline. Revisa tu conexión e inténtalo de nuevo.</p>
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
