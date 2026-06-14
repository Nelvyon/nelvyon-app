"use client";

import Link from "next/link";

import { PanelCard } from "@/core/ui/PanelCard";
import { useAdsUnifiedReporting } from "@/features/publicidad/hooks";
import { useSocialUnifiedReporting } from "@/features/social/hooks";
import { useFunnelsUnifiedReporting } from "@/features/funnels/hooks";
import { useEcommerceUnifiedReporting } from "@/features/ecommerce/hooks";
import { usePipelineSummary } from "@/features/deals/hooks";
import {
  ECOMMERCE_GROWTH_PACK_ID,
  LOCAL_GROWTH_PACK_ID,
  SAAS_B2B_GROWTH_PACK_ID,
  type PackId,
} from "@/lib/packs/types";

export function PackEliteSnapshots({ packId }: { packId: PackId }) {
  const ads = useAdsUnifiedReporting();
  const social = useSocialUnifiedReporting();
  const funnels = useFunnelsUnifiedReporting();
  const ecommerce = useEcommerceUnifiedReporting();
  const pipeline = usePipelineSummary();

  if (packId === LOCAL_GROWTH_PACK_ID) {
    return (
      <PanelCard>
        <h3 className="text-base font-semibold">Servicios élite conectados</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Tras el pack, el cliente ve métricas reales en estos módulos.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
          <Snapshot href="/publicidad" label="Publicidad local" loading={ads.isLoading} value={`${(ads.data?.unified?.total_spend ?? 0).toFixed(0)} €`} />
          <Snapshot href="/social" label="Alcance social" loading={social.isLoading} value={String(social.data?.unified?.total_reach ?? 0)} />
          <Snapshot href="/reputacion" label="Reputación" loading={false} value="Google Business" />
        </dl>
      </PanelCard>
    );
  }

  if (packId === ECOMMERCE_GROWTH_PACK_ID) {
    return (
      <PanelCard>
        <h3 className="text-base font-semibold">Servicios élite conectados</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
          <Snapshot href="/ecommerce" label="Ingresos tienda" loading={ecommerce.isLoading} value={`€${((ecommerce.data?.unified?.total_revenue_cents ?? 0) / 100).toLocaleString("es-ES")}`} />
          <Snapshot href="/publicidad" label="ROAS ads" loading={ads.isLoading} value={`${(ads.data?.unified?.blended_roas ?? 0).toFixed(2)}x`} />
          <Snapshot href="/analytics/ecommerce" label="Abandono carrito" loading={ecommerce.isLoading} value={`${ecommerce.data?.unified?.cart_abandonment_rate ?? 0}%`} />
        </dl>
      </PanelCard>
    );
  }

  if (packId === SAAS_B2B_GROWTH_PACK_ID) {
    const stages = pipeline.data?.by_stage ?? pipeline.data?.items ?? [];
    const totalDeals = pipeline.data?.total_count ?? stages.reduce((a, s) => a + (s.count ?? 0), 0);
    return (
      <PanelCard>
        <h3 className="text-base font-semibold">Servicios élite conectados</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
          <Snapshot href="/crm/deals" label="Deals pipeline" loading={pipeline.isLoading} value={String(totalDeals)} />
          <Snapshot href="/funnels" label="Conversiones embudo" loading={funnels.isLoading} value={String(funnels.data?.unified?.total_conversions ?? 0)} />
          <Snapshot href="/campaigns" label="Campañas nurture" loading={false} value="Email B2B" />
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
