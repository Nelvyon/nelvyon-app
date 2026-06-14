"use client";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { SocialMetricCard, SocialMockBadge } from "@/features/social/components/SocialPanels";
import { SocialSubNav } from "@/features/social/components/SocialSubNav";
import { ReportingSubNav } from "@/features/reporting/components/ReportingSubNav";
import { useSocialModuleAnalytics, useSocialUnifiedReporting } from "@/features/social/hooks";

export function AnalyticsSocialClient() {
  const unifiedQuery = useSocialUnifiedReporting();
  const moduleQuery = useSocialModuleAnalytics("30d");
  const kpis = (moduleQuery.data?.kpis ?? {}) as Record<string, number>;
  const unified = unifiedQuery.data?.unified;

  return (
    <ProtectedLayout module="social">
      <div className="space-y-6">
        <ReportingSubNav />
        <SocialSubNav />

        <div className="flex flex-wrap items-center gap-3">
          <SocialMockBadge mock={unified?.mock} />
        </div>

        {unifiedQuery.error || moduleQuery.error ? (
          <ErrorNotice>
            <p>No pudimos cargar analytics de Social.</p>
          </ErrorNotice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SocialMetricCard
            label="Posts totales"
            loading={moduleQuery.isLoading}
            value={String(kpis.total_posts ?? unified?.posts_published ?? 0)}
          />
          <SocialMetricCard
            label="Engagement rate"
            loading={moduleQuery.isLoading}
            value={`${Number(kpis.engagement_rate ?? 0).toFixed(1)}%`}
          />
          <SocialMetricCard
            label="Impresiones"
            loading={moduleQuery.isLoading}
            value={String(kpis.impressions ?? unified?.total_reach ?? 0)}
          />
          <SocialMetricCard
            label="Menciones 24h"
            loading={unifiedQuery.isLoading}
            value={String(unified?.mentions_24h ?? 0)}
          />
        </div>

        <PanelCard>
          <h2 className="text-base font-semibold">Resumen ejecutivo Social</h2>
          {moduleQuery.isLoading ? (
            <SkeletonListRows rows={2} />
          ) : (
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">Publicación</dt>
                <dd className="mt-1 text-sm">
                  {unified?.posts_scheduled ?? 0} programados · {unified?.posts_published ?? 0}{" "}
                  publicados · {unified?.connected_accounts ?? 0} cuentas
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">Marca</dt>
                <dd className="mt-1 text-sm">
                  Sentimiento neto {(unified?.sentiment_net ?? 0).toFixed(1)} ·{" "}
                  {unified?.active_alerts ?? 0} alertas
                </dd>
              </div>
            </dl>
          )}
        </PanelCard>
      </div>
    </ProtectedLayout>
  );
}
