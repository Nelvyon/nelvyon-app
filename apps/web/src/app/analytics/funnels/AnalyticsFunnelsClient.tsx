"use client";

import Link from "next/link";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import {
  FunnelConversionChart,
  FunnelMetricCard,
} from "@/features/funnels/components/FunnelPanels";
import { FunnelsSubNav } from "@/features/funnels/components/FunnelsSubNav";
import { useFunnelAnalytics, useFunnelsList, useFunnelsUnifiedReporting } from "@/features/funnels/hooks";
import { ReportingSubNav } from "@/features/reporting/components/ReportingSubNav";

export function AnalyticsFunnelsClient() {
  const unifiedQuery = useFunnelsUnifiedReporting();
  const listQuery = useFunnelsList();
  const unified = unifiedQuery.data?.unified;
  const items = listQuery.data?.items ?? [];
  const firstId = items[0]?.id;
  const firstAnalyticsQuery = useFunnelAnalytics(firstId ?? "");

  return (
    <ProtectedLayout module="funnels">
      <div className="space-y-6">
        <ReportingSubNav />
        <FunnelsSubNav />

        {unifiedQuery.error ? (
          <ErrorNotice>
            <p>No pudimos cargar analytics de embudos.</p>
          </ErrorNotice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FunnelMetricCard
            label="Embudos"
            loading={unifiedQuery.isLoading}
            sub={`${unified?.active_funnels ?? 0} activos`}
            value={String(unified?.total_funnels ?? 0)}
          />
          <FunnelMetricCard
            label="Visitas"
            loading={unifiedQuery.isLoading}
            value={String(unified?.total_visits ?? 0)}
          />
          <FunnelMetricCard
            label="Conversión media"
            loading={unifiedQuery.isLoading}
            value={`${unified?.avg_conversion_rate ?? 0}%`}
          />
          <FunnelMetricCard
            label="Deals CRM"
            loading={unifiedQuery.isLoading}
            sub={`Ads €${(unified?.ads_spend ?? 0).toLocaleString("es-ES")}`}
            value={String(unified?.deals_total ?? 0)}
          />
        </div>

        <PanelCard>
          <h2 className="text-base font-semibold">Conversión por campaña y paso</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Agregado de los embudos del workspace con datos de Publicidad y pipeline CRM.
          </p>
          {unifiedQuery.isLoading ? (
            <SkeletonListRows rows={3} />
          ) : (
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">Conversiones</dt>
                <dd className="mt-1 text-lg font-semibold">{unified?.total_conversions ?? 0}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">Ingresos atribuidos</dt>
                <dd className="mt-1 text-lg font-semibold">
                  €{(unified?.attributed_revenue ?? 0).toLocaleString("es-ES")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">ROAS publicidad</dt>
                <dd className="mt-1 text-lg font-semibold">{(unified?.ads_roas ?? 0).toFixed(2)}x</dd>
              </div>
            </dl>
          )}
        </PanelCard>

        {firstId ? (
          <PanelCard>
            <h2 className="text-base font-semibold">Primer embudo — vista rápida</h2>
            <div className="mt-4">
              <FunnelConversionChart analytics={firstAnalyticsQuery.data} />
            </div>
            <Button asChild className="mt-4" size="sm" variant="outline">
              <Link href={`/funnels/${firstId}`}>Ver embudo completo</Link>
            </Button>
          </PanelCard>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/funnels/builder">Crear embudo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/publicidad">Revisar campañas</Link>
          </Button>
        </div>
      </div>
    </ProtectedLayout>
  );
}
