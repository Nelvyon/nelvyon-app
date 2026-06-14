"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import {
  FunnelConversionChart,
  FunnelMetricCard,
  FunnelStepPipeline,
} from "@/features/funnels/components/FunnelPanels";
import { FunnelsSubNav } from "@/features/funnels/components/FunnelsSubNav";
import { useFunnel, useFunnelAnalytics } from "@/features/funnels/hooks";

export function FunnelDetailClient() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const funnelQuery = useFunnel(id);
  const analyticsQuery = useFunnelAnalytics(id);
  const funnel = funnelQuery.data;
  const analytics = analyticsQuery.data;
  const steps = funnel?.steps?.length ? funnel.steps : [];

  return (
    <ProtectedLayout module="funnels">
      <div className="space-y-6">
        <FunnelsSubNav />

        {funnelQuery.error || analyticsQuery.error ? (
          <ErrorNotice>
            <p>No pudimos cargar el detalle del embudo.</p>
          </ErrorNotice>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{funnel?.name ?? "Embudo"}</h1>
            <p className="text-sm text-muted-foreground">
              Estado: {funnel?.status ?? "—"}
              {funnel?.campaign_id ? ` · Campaña #${funnel.campaign_id}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/publicidad">Publicidad</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/crm/deals">CRM deals</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FunnelMetricCard
            label="Pasos"
            loading={funnelQuery.isLoading}
            value={String(funnel?.step_count ?? steps.length)}
          />
          <FunnelMetricCard
            label="Visitas totales"
            loading={analyticsQuery.isLoading}
            value={String(analytics?.steps?.reduce((n, s) => n + s.visits, 0) ?? 0)}
          />
          <FunnelMetricCard
            label="Conversiones"
            loading={analyticsQuery.isLoading}
            value={String(analytics?.steps?.reduce((n, s) => n + s.conversions, 0) ?? 0)}
          />
          <FunnelMetricCard
            label="Ingresos atribuidos"
            loading={analyticsQuery.isLoading}
            value={`€${(analytics?.total_attributed_revenue ?? 0).toLocaleString("es-ES")}`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <PanelCard>
            <h2 className="text-base font-semibold">Pipeline del embudo</h2>
            {funnelQuery.isLoading ? (
              <SkeletonListRows rows={4} />
            ) : (
              <div className="mt-4">
                <FunnelStepPipeline analytics={analytics?.steps} steps={steps} />
              </div>
            )}
          </PanelCard>

          <PanelCard>
            <h2 className="text-base font-semibold">Conversión por paso</h2>
            <div className="mt-4">
              {analyticsQuery.isLoading ? (
                <SkeletonListRows rows={3} />
              ) : (
                <FunnelConversionChart analytics={analytics} />
              )}
            </div>
            {analytics?.steps?.length ? (
              <ul className="mt-4 divide-y divide-border text-sm">
                {analytics.steps.map((s) => (
                  <li className="flex justify-between py-2" key={s.step_id}>
                    <span>{s.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {s.conversion_rate}% CR · {s.drop_off_rate}% abandono
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </PanelCard>
        </div>
      </div>
    </ProtectedLayout>
  );
}
