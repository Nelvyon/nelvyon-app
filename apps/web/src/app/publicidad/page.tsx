"use client";

import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import {
  AdsAlertsBanner,
  AdsCampaignList,
  AdsMetricCard,
  AdsMiniChart,
  AdsMockBadge,
} from "@/features/publicidad/components/AdsPanels";
import { AdsTemplateQuickLaunch } from "@/features/publicidad/components/AdsTemplateQuickLaunch";
import { PublicidadSubNav } from "@/features/publicidad/components/PublicidadSubNav";
import { useAdsRoasAlerts, useAdsUnifiedReporting } from "@/features/publicidad/hooks";
import type { AdsCampaignRow } from "@/features/publicidad/types";

export default function PublicidadHubPage() {
  const reportingQuery = useAdsUnifiedReporting();
  const alertsQuery = useAdsRoasAlerts(1.5);

  const google = reportingQuery.data?.google;
  const meta = reportingQuery.data?.meta;
  const unified = reportingQuery.data?.unified;
  const googleSummary = google?.summary ?? {};
  const metaSummary = meta?.summary ?? {};
  const googleCampaigns = (google?.campaigns ?? []) as AdsCampaignRow[];
  const metaCampaigns = (meta?.campaigns ?? []) as AdsCampaignRow[];
  const isMock = Boolean(google?.mock || meta?.mock);
  const chartGoogle = googleCampaigns.map((c) => Number(c.cost ?? 0));
  const chartMeta = metaCampaigns.map((c) => Number(c.spend ?? 0));

  return (
    <ProtectedLayout module="ads">
      <div className="space-y-6">
        <PublicidadSubNav />

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Google Ads y Meta Ads unificados — briefing con IA, lanzamiento y optimización continua.
          </p>
          <AdsMockBadge mock={isMock} />
        </div>

        {alertsQuery.data?.alerts?.length ? (
          <AdsAlertsBanner alerts={alertsQuery.data.alerts} />
        ) : null}

        {reportingQuery.error instanceof ApiError && reportingQuery.error.status === 403 ? (
          <ForbiddenNotice>
            <p>No tienes acceso a Publicidad en este workspace.</p>
          </ForbiddenNotice>
        ) : null}
        {reportingQuery.error && !(reportingQuery.error instanceof ApiError && reportingQuery.error.status === 403) ? (
          <ErrorNotice>
            <p>No pudimos cargar las métricas de publicidad.</p>
          </ErrorNotice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdsMetricCard
            label="Inversión total"
            loading={reportingQuery.isLoading}
            sub="Google + Meta"
            value={`${(unified?.total_spend ?? 0).toFixed(2)} €`}
          />
          <AdsMetricCard
            label="ROAS combinado"
            loading={reportingQuery.isLoading}
            sub="Umbral alerta: 1,5"
            value={(unified?.blended_roas ?? 0).toFixed(2)}
          />
          <AdsMetricCard
            label="CTR Google"
            loading={reportingQuery.isLoading}
            sub={`CPC ${(googleSummary.cpc ?? 0).toFixed(2)} €`}
            value={`${(googleSummary.ctr ?? 0).toFixed(2)}%`}
          />
          <AdsMetricCard
            label="CPM Meta"
            loading={reportingQuery.isLoading}
            sub={`ROAS ${(metaSummary.roas ?? 0).toFixed(2)}`}
            value={`${(metaSummary.cpm ?? 0).toFixed(2)} €`}
          />
        </div>

        <AdsTemplateQuickLaunch />

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/publicidad/briefing">Briefing personalizado con IA</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/publicidad/google">Ver Google Ads</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/publicidad/meta">Ver Meta Ads</Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <PanelCard>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Google Ads</h2>
              <Link className="text-sm text-link hover:underline" href="/publicidad/google">
                Detalle
              </Link>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {googleSummary.impressions ?? 0} imp · {googleSummary.clicks ?? 0} clics
            </p>
            <div className="mt-4">
              <AdsMiniChart color="#0066FF" values={chartGoogle} />
            </div>
            {reportingQuery.isLoading ? (
              <SkeletonListRows rows={3} />
            ) : (
              <AdsCampaignList campaigns={googleCampaigns} platform="google" />
            )}
          </PanelCard>

          <PanelCard>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Meta Ads</h2>
              <Link className="text-sm text-link hover:underline" href="/publicidad/meta">
                Detalle
              </Link>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Alcance {metaSummary.reach ?? 0} · {metaSummary.impressions ?? 0} imp
            </p>
            <div className="mt-4">
              <AdsMiniChart color="#1877F2" values={chartMeta} />
            </div>
            {reportingQuery.isLoading ? (
              <SkeletonListRows rows={3} />
            ) : (
              <AdsCampaignList campaigns={metaCampaigns} platform="meta" />
            )}
          </PanelCard>
        </div>
      </div>
    </ProtectedLayout>
  );
}
