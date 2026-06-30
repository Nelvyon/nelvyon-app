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

function fmtNum(value: number | undefined | null, format: (n: number) => string): string {
  if (value == null || value <= 0) return "—";
  return format(value);
}

export function PackEliteSnapshots({ packId }: { packId: PackId }) {
  const ads = useAdsUnifiedReporting();
  const social = useSocialUnifiedReporting();
  const funnels = useFunnelsUnifiedReporting();
  const ecommerce = useEcommerceUnifiedReporting();
  const pipeline = usePipelineSummary();

  if (packId === LOCAL_GROWTH_PACK_ID) {
    const spend = ads.data?.unified?.total_spend;
    const reach = social.data?.unified?.total_reach;
    return (
      <PanelCard>
        <h3 className="text-base font-semibold">Impacto en servicios élite</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Tras el pack, el cliente monitoriza resultados en estos módulos.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
          <Snapshot
            href="/publicidad"
            label="Inversión publicitaria"
            loading={ads.isLoading}
            value={fmtNum(spend, (n) => `${n.toLocaleString("es-ES")} €`)}
          />
          <Snapshot
            href="/social"
            label="Alcance social"
            loading={social.isLoading}
            value={fmtNum(reach, (n) => n.toLocaleString("es-ES"))}
          />
          <Snapshot
            href="/reputacion"
            label="Reputación local"
            loading={false}
            value="Google Business"
          />
        </dl>
      </PanelCard>
    );
  }

  if (packId === ECOMMERCE_GROWTH_PACK_ID) {
    const revenueCents = ecommerce.data?.unified?.total_revenue_cents;
    const roas = ads.data?.unified?.blended_roas;
    const abandon = ecommerce.data?.unified?.cart_abandonment_rate;
    return (
      <PanelCard>
        <h3 className="text-base font-semibold">Impacto en servicios élite</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
          <Snapshot
            href="/ecommerce"
            label="Ingresos tienda"
            loading={ecommerce.isLoading}
            value={fmtNum(revenueCents, (n) => `€${(n / 100).toLocaleString("es-ES")}`)}
          />
          <Snapshot
            href="/publicidad"
            label="ROAS publicidad"
            loading={ads.isLoading}
            value={fmtNum(roas, (n) => `${n.toFixed(2)}x`)}
          />
          <Snapshot
            href="/analytics/ecommerce"
            label="Abandono de carrito"
            loading={ecommerce.isLoading}
            value={fmtNum(abandon, (n) => `${n.toFixed(1)}%`)}
          />
        </dl>
      </PanelCard>
    );
  }

  if (packId === SAAS_B2B_GROWTH_PACK_ID) {
    const stages = pipeline.data?.by_stage ?? pipeline.data?.items ?? [];
    const totalDeals = pipeline.data?.total_count ?? stages.reduce((a, s) => a + (s.count ?? 0), 0);
    const conversions = funnels.data?.unified?.total_conversions;
    return (
      <PanelCard>
        <h3 className="text-base font-semibold">Impacto en servicios élite</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
          <Snapshot
            href="/crm/deals"
            label="Oportunidades en pipeline"
            loading={pipeline.isLoading}
            value={fmtNum(totalDeals, (n) => String(n))}
          />
          <Snapshot
            href="/funnels"
            label="Conversiones embudo"
            loading={funnels.isLoading}
            value={fmtNum(conversions, (n) => String(n))}
          />
          <Snapshot
            href="/campaigns"
            label="Secuencias nurture"
            loading={false}
            value="Email B2B"
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
