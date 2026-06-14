"use client";

import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import {
  FunnelMetricCard,
  FunnelStepPipeline,
} from "@/features/funnels/components/FunnelPanels";
import { FunnelsSubNav } from "@/features/funnels/components/FunnelsSubNav";
import { DEFAULT_FUNNEL_STEPS } from "@/features/funnels/constants";
import { useFunnelsList, useFunnelsUnifiedReporting } from "@/features/funnels/hooks";

export function FunnelsHubClient() {
  const unifiedQuery = useFunnelsUnifiedReporting();
  const listQuery = useFunnelsList();
  const unified = unifiedQuery.data?.unified;
  const items = listQuery.data?.items ?? [];

  return (
    <ProtectedLayout module="funnels">
      <div className="space-y-6">
        <FunnelsSubNav />

        {unifiedQuery.error instanceof ApiError && unifiedQuery.error.status === 403 ? (
          <ForbiddenNotice>
            <p>No tienes acceso a Embudos en este workspace.</p>
          </ForbiddenNotice>
        ) : null}
        {unifiedQuery.error && !(unifiedQuery.error instanceof ApiError && unifiedQuery.error.status === 403) ? (
          <ErrorNotice>
            <p>No pudimos cargar el resumen de embudos.</p>
          </ErrorNotice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FunnelMetricCard
            label="Embudos activos"
            loading={unifiedQuery.isLoading}
            sub={`${unified?.total_funnels ?? 0} totales`}
            value={String(unified?.active_funnels ?? 0)}
          />
          <FunnelMetricCard
            label="Visitas"
            loading={unifiedQuery.isLoading}
            sub={`${unified?.total_conversions ?? 0} conversiones`}
            value={String(unified?.total_visits ?? 0)}
          />
          <FunnelMetricCard
            label="Tasa media CR"
            loading={unifiedQuery.isLoading}
            sub="Por paso (muestra)"
            value={`${unified?.avg_conversion_rate ?? 0}%`}
          />
          <FunnelMetricCard
            label="Ingresos atribuidos"
            loading={unifiedQuery.isLoading}
            sub={`ROAS ads ${(unified?.ads_roas ?? 0).toFixed(2)}x`}
            value={`€${(unified?.attributed_revenue ?? 0).toLocaleString("es-ES")}`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PanelCard>
            <h2 className="text-base font-semibold">Integración CRM</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Deals del pipeline conectados al cierre del embudo.
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">Deals</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">
                  {unifiedQuery.isLoading ? "…" : unified?.deals_total ?? 0}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">Inversión ads</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">
                  {unifiedQuery.isLoading ? "…" : `€${(unified?.ads_spend ?? 0).toLocaleString("es-ES")}`}
                </dd>
              </div>
            </dl>
            <Button asChild className="mt-4" size="sm" variant="outline">
              <Link href="/crm/deals">Ver pipeline CRM</Link>
            </Button>
          </PanelCard>

          <PanelCard>
            <h2 className="text-base font-semibold">Plantilla recomendada</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Anuncio → Landing → Formulario → CRM
            </p>
            <div className="mt-4">
              <FunnelStepPipeline steps={[...DEFAULT_FUNNEL_STEPS]} />
            </div>
          </PanelCard>
        </div>

        <PanelCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Tus embudos</h2>
            <Button asChild size="sm">
              <Link href="/funnels/builder">Abrir builder</Link>
            </Button>
          </div>
          {listQuery.isLoading ? (
            <SkeletonListRows rows={3} />
          ) : items.length ? (
            <ul className="mt-3 divide-y divide-border">
              {items.slice(0, 6).map((f) => (
                <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={f.id}>
                  <div>
                    <Link className="font-medium text-link hover:underline" href={`/funnels/${f.id}`}>
                      {f.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {f.step_count ?? f.steps?.length ?? 0} pasos · {f.status}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/funnels/${f.id}`}>Ver métricas</Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Crea tu primer embudo con la plantilla Anuncio → Landing → Formulario → CRM.
            </p>
          )}
        </PanelCard>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/funnels/builder">Nuevo embudo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/analytics/funnels">Analytics de conversión</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/publicidad">Conectar publicidad</Link>
          </Button>
        </div>
      </div>
    </ProtectedLayout>
  );
}
