"use client";

import Link from "next/link";

import { PanelCard } from "@/core/ui/PanelCard";
import { AdsMetricCard } from "@/features/publicidad/components/AdsPanels";
import { SocialMetricCard } from "@/features/social/components/SocialPanels";
import { FunnelMetricCard } from "@/features/funnels/components/FunnelPanels";
import { EcommerceMetricCard } from "@/features/ecommerce/components/EcommercePanels";
import { useAdsUnifiedReporting } from "@/features/publicidad/hooks";
import { useSocialUnifiedReporting } from "@/features/social/hooks";
import { useFunnelsUnifiedReporting } from "@/features/funnels/hooks";
import { useEcommerceUnifiedReporting } from "@/features/ecommerce/hooks";

const DEGRADED_VALUE = "—";

export function AnalyticsHubSnapshots() {
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

  const adsSpend = anyMock ? DEGRADED_VALUE : `${(ads.data?.unified?.total_spend ?? 0).toFixed(0)} €`;
  const socialReach = anyMock ? DEGRADED_VALUE : String(social.data?.unified?.total_reach ?? 0);
  const funnelConversions = anyMock ? DEGRADED_VALUE : String(funnels.data?.unified?.total_conversions ?? 0);
  const ecommerceOrders = anyMock ? DEGRADED_VALUE : String(ecommerce.data?.unified?.paid_orders ?? 0);

  return (
    <section aria-label="Instantáneas de módulos">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold text-foreground">Instantáneas</h2>
        {anyMock ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
            Sin datos conectados
          </span>
        ) : null}
      </div>
      {anyMock ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Conecta integraciones reales (ads, social, embudos o tienda) para ver métricas aquí. No se muestran cifras demo.
        </p>
      ) : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/analytics/publicidad">
          <AdsMetricCard
            label="Publicidad"
            loading={ads.isLoading && !anyMock}
            sub={anyMock ? "Integración no conectada" : "Inversión total"}
            value={adsSpend}
          />
        </Link>
        <Link href="/analytics/social">
          <SocialMetricCard
            label="Social"
            loading={social.isLoading && !anyMock}
            sub={anyMock ? "Integración no conectada" : "Alcance"}
            value={socialReach}
          />
        </Link>
        <Link href="/analytics/funnels">
          <FunnelMetricCard
            label="Embudos"
            loading={funnels.isLoading && !anyMock}
            sub={anyMock ? "Integración no conectada" : "Conversiones"}
            value={funnelConversions}
          />
        </Link>
        <Link href="/analytics/ecommerce">
          <EcommerceMetricCard
            label="Ecommerce"
            loading={ecommerce.isLoading && !anyMock}
            sub={anyMock ? "Integración no conectada" : "Pedidos pagados"}
            value={ecommerceOrders}
          />
        </Link>
      </div>
      <PanelCard className="mt-4">
        <h3 className="text-sm font-semibold">Rendimiento cruzado</h3>
        {anyMock ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Métricas cruzadas no disponibles hasta conectar al menos una fuente de datos real.
          </p>
        ) : (
          <dl className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-muted-foreground">ROAS combinado</dt>
              <dd className="font-semibold tabular-nums">{(ads.data?.unified?.blended_roas ?? 0).toFixed(2)}x</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Sentimiento social</dt>
              <dd className="font-semibold tabular-nums">+{(social.data?.unified?.sentiment_net ?? 0).toFixed(0)} pts</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ingresos atribuidos embudos</dt>
              <dd className="font-semibold tabular-nums">
                €{(funnels.data?.unified?.attributed_revenue ?? 0).toLocaleString("es-ES")}
              </dd>
            </div>
          </dl>
        )}
      </PanelCard>
    </section>
  );
}
