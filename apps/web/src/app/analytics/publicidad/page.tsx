"use client";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import {
  AdsAlertsBanner,
  AdsMetricCard,
  AdsMockBadge,
} from "@/features/publicidad/components/AdsPanels";
import { PublicidadSubNav } from "@/features/publicidad/components/PublicidadSubNav";
import { ReportingSubNav } from "@/features/reporting/components/ReportingSubNav";
import { useAdsRoasAlerts, useAdsUnifiedReporting } from "@/features/publicidad/hooks";

export default function AnalyticsPublicidadPage() {
  const reportingQuery = useAdsUnifiedReporting();
  const alertsQuery = useAdsRoasAlerts(1.5);
  const google = reportingQuery.data?.google?.summary ?? {};
  const meta = reportingQuery.data?.meta?.summary ?? {};
  const unified = reportingQuery.data?.unified;
  const isMock = Boolean(reportingQuery.data?.google?.mock || reportingQuery.data?.meta?.mock);

  return (
    <ProtectedLayout module="ads">
      <div className="space-y-6">
        <ReportingSubNav />
        <PublicidadSubNav />

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Métricas consolidadas de inversión, ROAS y alertas de rendimiento por plataforma.
          </p>
          <AdsMockBadge mock={isMock} />
        </div>

        {alertsQuery.data?.alerts?.length ? (
          <AdsAlertsBanner alerts={alertsQuery.data.alerts} />
        ) : null}

        {reportingQuery.error ? (
          <ErrorNotice>
            <p>No pudimos cargar analytics de publicidad.</p>
          </ErrorNotice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AdsMetricCard
            label="Inversión total"
            loading={reportingQuery.isLoading}
            value={`${(unified?.total_spend ?? 0).toFixed(2)} €`}
          />
          <AdsMetricCard
            label="ROAS combinado"
            loading={reportingQuery.isLoading}
            value={(unified?.blended_roas ?? 0).toFixed(2)}
          />
          <AdsMetricCard
            label="Gasto Google"
            loading={reportingQuery.isLoading}
            value={`${(google.cost ?? 0).toFixed(2)} €`}
          />
          <AdsMetricCard
            label="Gasto Meta"
            loading={reportingQuery.isLoading}
            value={`${(meta.spend ?? 0).toFixed(2)} €`}
          />
          <AdsMetricCard
            label="CTR Google"
            loading={reportingQuery.isLoading}
            value={`${(google.ctr ?? 0).toFixed(2)}%`}
          />
          <AdsMetricCard
            label="ROAS Meta"
            loading={reportingQuery.isLoading}
            value={(meta.roas ?? 0).toFixed(2)}
          />
        </div>

        <PanelCard>
          <h2 className="text-base font-semibold">Resumen por plataforma</h2>
          {reportingQuery.isLoading ? (
            <SkeletonListRows rows={2} />
          ) : (
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">Google Ads</dt>
                <dd className="mt-1 text-sm">
                  {google.impressions ?? 0} imp · {google.clicks ?? 0} clics · ROAS{" "}
                  {(google.roas ?? 0).toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">Meta Ads</dt>
                <dd className="mt-1 text-sm">
                  Alcance {meta.reach ?? 0} · CPM {(meta.cpm ?? 0).toFixed(2)} € · ROAS{" "}
                  {(meta.roas ?? 0).toFixed(2)}
                </dd>
              </div>
            </dl>
          )}
        </PanelCard>
      </div>
    </ProtectedLayout>
  );
}
