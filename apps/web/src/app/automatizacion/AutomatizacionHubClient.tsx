"use client";

import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { AutomatizacionMetricCard } from "@/features/automatizacion/components/AutomatizacionPanels";
import { AutomatizacionSubNav } from "@/features/automatizacion/components/AutomatizacionSubNav";
import { CONNECTOR_LINKS, CONNECTOR_LABELS } from "@/features/automatizacion/constants";
import { useAutomatizacionUnifiedReporting } from "@/features/automatizacion/hooks";

const CONNECTORS = ["crm", "helpdesk", "publicidad", "email", "ecommerce"] as const;

export function AutomatizacionHubClient() {
  const query = useAutomatizacionUnifiedReporting();
  const unified = query.data?.unified;

  return (
    <ProtectedLayout module="automations">
      <div className="space-y-6">
        <AutomatizacionSubNav />

        {query.error instanceof ApiError && query.error.status === 403 ? (
          <ForbiddenNotice>
            <p>No tienes acceso a Automatización en este workspace.</p>
          </ForbiddenNotice>
        ) : null}
        {query.error && !(query.error instanceof ApiError && query.error.status === 403) ? (
          <ErrorNotice>
            <p>No pudimos cargar el resumen de automatizaciones.</p>
          </ErrorNotice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AutomatizacionMetricCard
            label="Flujos totales"
            loading={query.isLoading}
            sub={`${unified?.active_flows ?? 0} activos`}
            value={String(unified?.total_flows ?? 0)}
          />
          <AutomatizacionMetricCard
            label="Ejecuciones"
            loading={query.isLoading}
            sub={`${unified?.workflow_runs ?? 0} visuales · ${unified?.rule_executions ?? 0} reglas`}
            value={String(unified?.total_runs ?? 0)}
          />
          <AutomatizacionMetricCard
            label="Jobs completados"
            loading={query.isLoading}
            sub={`${unified?.jobs_failed ?? 0} fallidos`}
            value={String(unified?.jobs_completed ?? 0)}
          />
          <AutomatizacionMetricCard
            label="Tasa éxito"
            loading={query.isLoading}
            value={`${(unified?.success_rate ?? 0).toFixed(0)}%`}
          />
        </div>

        <PanelCard>
          <h2 className="text-base font-semibold">Conectores del workspace</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enlaza flujos con CRM, Helpdesk, Publicidad, Email y Ecommerce.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {CONNECTORS.map((c) => (
              <Button asChild key={c} size="sm" variant="outline">
                <Link href={CONNECTOR_LINKS[c]}>{CONNECTOR_LABELS[c]}</Link>
              </Button>
            ))}
          </div>
        </PanelCard>

        <PanelCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Empieza rápido</h2>
            <Button asChild size="sm">
              <Link href="/automatizacion/recetas">Ver recetas</Link>
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Plantillas listas: onboarding CRM, recuperación de carrito, alertas ROAS, tickets urgentes y más.
          </p>
        </PanelCard>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/automatizacion/flujos">Crear flujo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/analytics/automatizacion">Analytics de eventos</Link>
          </Button>
        </div>
      </div>
    </ProtectedLayout>
  );
}
