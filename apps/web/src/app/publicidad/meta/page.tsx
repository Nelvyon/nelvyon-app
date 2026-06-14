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
import { useAdsMetaReporting, useAdsMetaStatus } from "@/features/publicidad/hooks";
import type { AdsCampaignRow } from "@/features/publicidad/types";

export default function PublicidadMetaPage() {
  const statusQuery = useAdsMetaStatus();
  const reportingQuery = useAdsMetaReporting();
  const summary = reportingQuery.data?.summary ?? {};
  const campaigns = (reportingQuery.data?.campaigns ?? []) as AdsCampaignRow[];
  const chartValues = campaigns.map((c) => Number(c.spend ?? 0));

  return (
    <ProtectedLayout module="ads">
      <div className="space-y-6">
        <PublicidadSubNav />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Campañas de Facebook e Instagram con creatividades y ROAS por anuncio.
          </p>
          <AdsMockBadge mock={statusQuery.data?.mock ?? reportingQuery.data?.mock} />
        </div>

        <PanelCard className="border-dashed">
          <p className="text-sm text-muted-foreground">
            Conecta Meta Business para sincronizar cuentas publicitarias.{" "}
            <Link className="text-link hover:underline" href="/api/oauth/meta">
              Conectar Meta
            </Link>
          </p>
        </PanelCard>

        {reportingQuery.error ? (
          <ErrorNotice>
            <p>No pudimos cargar el reporting de Meta Ads.</p>
          </ErrorNotice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdsMetricCard label="Alcance" loading={reportingQuery.isLoading} value={String(summary.reach ?? 0)} />
          <AdsMetricCard
            label="Impresiones"
            loading={reportingQuery.isLoading}
            value={String(summary.impressions ?? 0)}
          />
          <AdsMetricCard
            label="CPM"
            loading={reportingQuery.isLoading}
            value={`${(summary.cpm ?? 0).toFixed(2)} €`}
          />
          <AdsMetricCard
            label="ROAS"
            loading={reportingQuery.isLoading}
            value={(summary.roas ?? 0).toFixed(2)}
          />
        </div>

        <PanelCard>
          <h2 className="text-base font-semibold">Campañas activas</h2>
          <div className="mt-4">
            <AdsMiniChart color="#1877F2" values={chartValues} />
          </div>
          {reportingQuery.isLoading ? (
            <SkeletonListRows rows={4} />
          ) : (
            <AdsCampaignList campaigns={campaigns} platform="meta" />
          )}
        </PanelCard>

        <Button asChild variant="outline">
          <Link href="/publicidad/briefing">Lanzar campaña con IA</Link>
        </Button>
      </div>
    </ProtectedLayout>
  );
}
