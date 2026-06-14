"use client";

import Link from "next/link";

import { PanelCard } from "@/core/ui/PanelCard";
import { useAdsUnifiedReporting } from "@/features/publicidad/hooks";
import { useSocialUnifiedReporting } from "@/features/social/hooks";
import { useFunnelsUnifiedReporting } from "@/features/funnels/hooks";
import { useEcommerceUnifiedReporting } from "@/features/ecommerce/hooks";

function PulseCard({
  href,
  label,
  value,
  sub,
  loading,
}: {
  href: string;
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <Link href={href}>
      <PanelCard className="h-full transition-shadow hover:shadow-md">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{loading ? "…" : value}</p>
        {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
      </PanelCard>
    </Link>
  );
}

export function WorkspacePulse() {
  const ads = useAdsUnifiedReporting();
  const social = useSocialUnifiedReporting();
  const funnels = useFunnelsUnifiedReporting();
  const ecommerce = useEcommerceUnifiedReporting();

  const anyMock =
    ads.data?.google?.mock ||
    ads.data?.meta?.mock ||
    social.data?.unified?.mock ||
    funnels.data?.unified?.mock ||
    ecommerce.data?.unified?.mock;

  return (
    <section aria-label="Pulso del workspace">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-foreground">Pulso del workspace</h2>
        {anyMock ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
            Datos demo
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Vista ejecutiva de ingresos, tráfico y engagement en tiempo real.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PulseCard
          href="/publicidad"
          label="Inversión ads"
          loading={ads.isLoading}
          sub={`ROAS ${(ads.data?.unified?.blended_roas ?? 0).toFixed(2)}x`}
          value={`${(ads.data?.unified?.total_spend ?? 0).toLocaleString("es-ES")} €`}
        />
        <PulseCard
          href="/social"
          label="Alcance social"
          loading={social.isLoading}
          sub={`${social.data?.unified?.total_engagement ?? 0} interacciones`}
          value={(social.data?.unified?.total_reach ?? 0).toLocaleString("es-ES")}
        />
        <PulseCard
          href="/funnels"
          label="Conversiones embudo"
          loading={funnels.isLoading}
          sub={`${funnels.data?.unified?.total_visits ?? 0} visitas`}
          value={String(funnels.data?.unified?.total_conversions ?? 0)}
        />
        <PulseCard
          href="/ecommerce"
          label="Ingresos tienda"
          loading={ecommerce.isLoading}
          sub={`${ecommerce.data?.unified?.paid_orders ?? 0} pedidos`}
          value={`€${((ecommerce.data?.unified?.total_revenue_cents ?? 0) / 100).toLocaleString("es-ES")}`}
        />
      </div>
    </section>
  );
}
