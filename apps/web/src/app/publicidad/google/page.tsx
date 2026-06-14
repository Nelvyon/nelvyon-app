"use client";

import Link from "next/link";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import {
  AdsCampaignList,
  AdsMetricCard,
  AdsMiniChart,
  AdsMockBadge,
} from "@/features/publicidad/components/AdsPanels";
import { PublicidadSubNav } from "@/features/publicidad/components/PublicidadSubNav";
import { useAdsGoogleReporting, useAdsGoogleStatus } from "@/features/publicidad/hooks";
import type { AdsCampaignRow } from "@/features/publicidad/types";

export default function PublicidadGooglePage() {
  const statusQuery = useAdsGoogleStatus();
  const reportingQuery = useAdsGoogleReporting();
  const summary = reportingQuery.data?.summary ?? {};
  const campaigns = (reportingQuery.data?.campaigns ?? []) as AdsCampaignRow[];
  const chartValues = campaigns.map((c) => Number(c.cost ?? 0));

  return (
    <ProtectedLayout module="ads">
      <div className="space-y-6">
        <PublicidadSubNav />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Campañas de búsqueda, display y Performance Max con reporting unificado.
          </p>
          <AdsMockBadge mock={statusQuery.data?.mock ?? reportingQuery.data?.mock} />
        </div>

        {statusQuery.data && !statusQuery.data.oauth_configured ? (
          <PanelCard className="border-dashed">
            <p className="text-sm text-muted-foreground">
              Conecta tu cuenta de Google Ads para datos en vivo.{" "}
              <Link className="text-link hover:underline" href="/api/oauth/google">
                Conectar Google
              </Link>
            </p>
          </PanelCard>
        ) : null}

        {reportingQuery.error ? (
          <ErrorNotice>
            <p>No pudimos cargar el reporting de Google Ads.</p>
          </ErrorNotice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdsMetricCard
            label="Impresiones"
            loading={reportingQuery.isLoading}
            value={String(summary.impressions ?? 0)}
          />
          <AdsMetricCard label="Clics" loading={reportingQuery.isLoading} value={String(summary.clicks ?? 0)} />
          <AdsMetricCard
            label="CTR"
            loading={reportingQuery.isLoading}
            value={`${(summary.ctr ?? 0).toFixed(2)}%`}
          />
          <AdsMetricCard
            label="Inversión"
            loading={reportingQuery.isLoading}
            value={`${(summary.cost ?? 0).toFixed(2)} €`}
          />
        </div>

        <PanelCard>
          <h2 className="text-base font-semibold">Distribución por campaña</h2>
          <div className="mt-4">
            <AdsMiniChart color="#0066FF" values={chartValues} />
          </div>
          {reportingQuery.isLoading ? (
            <SkeletonListRows rows={4} />
          ) : (
            <AdsCampaignList campaigns={campaigns} platform="google" />
          )}
        </PanelCard>

        <Button asChild variant="outline">
          <Link href="/publicidad/briefing">Lanzar campaña con IA</Link>
        </Button>
      </div>
    </ProtectedLayout>
  );
}
