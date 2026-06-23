"use client";

import Link from "next/link";

import { PanelCard } from "@/core/ui/PanelCard";
import { useAdsUnifiedReporting } from "@/features/publicidad/hooks";
import { useFunnelsUnifiedReporting } from "@/features/funnels/hooks";
import { useEcommerceUnifiedReporting } from "@/features/ecommerce/hooks";
import { usePipelineSummary } from "@/features/deals/hooks";
import {
  buildDemoAdsUnified,
  buildDemoEcommerceUnified,
  buildDemoFunnelsUnified,
} from "@/lib/demoDashboardData";
import {
  ECOMMERCE_GROWTH_PACK_ID,
  LOCAL_GROWTH_PACK_ID,
  SAAS_B2B_GROWTH_PACK_ID,
  type PackId,
} from "@/lib/packs/types";

function pickNum(live: number | undefined | null, demo: number): number {
  if (live != null && live > 0) return live;
  return demo;
}

export function PackEliteSnapshots({ packId }: { packId: PackId }) {
  const ads = useAdsUnifiedReporting();
  const funnels = useFunnelsUnifiedReporting();
  const ecommerce = useEcommerceUnifiedReporting();
  const pipeline = usePipelineSummary();

  const demoAds = buildDemoAdsUnified();
  const demoEcom = buildDemoEcommerceUnified();

  if (packId === LOCAL_GROWTH_PACK_ID) {
    const demoAds = buildDemoAdsUnified();
    const demoFunnels = buildDemoFunnelsUnified();
    const spend = pickNum(ads.data?.unified?.total_spend, demoAds.unified.total_spend);
    const visits = pickNum(funnels.data?.unified?.total_visits, demoFunnels.unified.total_visits);
    const conversions = pickNum(
      funnels.data?.unified?.total_conversions,
      demoFunnels.unified.total_conversions,
    );
    const hasLiveAds = ads.data?.unified?.total_spend != null && ads.data.unified.total_spend > 0;
    const hasLiveFunnel = funnels.data?.unified?.total_visits != null && funnels.data.unified.total_visits > 0;
    return (
      <PanelCard>
        <h3 className="text-base font-semibold">Impacto en servicios élite</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasLiveAds || hasLiveFunnel
            ? "Métricas reales de módulos conectados."
            : "Vista demo con benchmarks de referencia hasta conectar ads y embudo."}
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
          <Snapshot
            href="/publicidad"
            label="Inversión publicitaria"
            loading={ads.isLoading}
            value={`${spend.toLocaleString("es-ES")} €`}
          />
          <Snapshot
            href="/funnels"
            label="Visitas embudo"
            loading={funnels.isLoading}
            value={visits.toLocaleString("es-ES")}
          />
          <Snapshot
            href="/crm"
            label="Conversiones embudo"
            loading={funnels.isLoading}
            value={String(conversions)}
          />
        </dl>
      </PanelCard>
    );
  }

  if (packId === ECOMMERCE_GROWTH_PACK_ID) {
    const revenueCents = pickNum(
      ecommerce.data?.unified?.total_revenue_cents,
      demoEcom.unified.total_revenue_cents,
    );
    const roas = pickNum(ads.data?.unified?.blended_roas, demoEcom.unified.ads_roas);
    const abandon = pickNum(
      ecommerce.data?.unified?.cart_abandonment_rate,
      demoEcom.unified.cart_abandonment_rate,
    );
    return (
      <PanelCard>
        <h3 className="text-base font-semibold">Impacto en servicios élite</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
          <Snapshot
            href="/ecommerce"
            label="Ingresos tienda"
            loading={ecommerce.isLoading}
            value={`€${(revenueCents / 100).toLocaleString("es-ES")}`}
          />
          <Snapshot
            href="/publicidad"
            label="ROAS publicidad"
            loading={ads.isLoading}
            value={`${roas.toFixed(2)}x`}
          />
          <Snapshot
            href="/analytics/ecommerce"
            label="Abandono de carrito"
            loading={ecommerce.isLoading}
            value={`${abandon.toFixed(1)}%`}
          />
        </dl>
      </PanelCard>
    );
  }

  if (packId === SAAS_B2B_GROWTH_PACK_ID) {
    const demoFunnels = buildDemoFunnelsUnified();
    const deals = pickNum(
      pipeline.data?.total_count ??
        pipeline.data?.by_stage?.reduce((a, s) => a + (s.count ?? 0), 0),
      12,
    );
    const conversions = pickNum(
      funnels.data?.unified?.total_conversions,
      demoFunnels.unified.total_conversions,
    );
    const hasPipeline =
      pipeline.data?.total_count != null && pipeline.data.total_count > 0;
    return (
      <PanelCard>
        <h3 className="text-base font-semibold">Impacto en servicios élite</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasPipeline
            ? "Pipeline real desde CRM."
            : "Vista demo B2B hasta registrar oportunidades en CRM."}
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
          <Snapshot
            href="/crm/deals"
            label="Oportunidades pipeline"
            loading={pipeline.isLoading}
            value={String(deals)}
          />
          <Snapshot
            href="/funnels"
            label="Conversiones embudo"
            loading={funnels.isLoading}
            value={String(conversions)}
          />
          <Snapshot
            href="/campaigns"
            label="Nurture B2B"
            loading={false}
            value="Ver campañas"
          />
        </dl>
      </PanelCard>
    );
  }

  return null;
}

function Snapshot({
  href,
  label,
  value,
  loading,
}: {
  href: string;
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <Link href={href}>
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 transition hover:border-primary/40">
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="mt-1 text-lg font-semibold tabular-nums">{loading ? "…" : value}</dd>
      </div>
    </Link>
  );
}
