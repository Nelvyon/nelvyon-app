"use client";

import Link from "next/link";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { CartCheckoutChart, EcommerceMetricCard } from "@/features/ecommerce/components/EcommercePanels";
import { EcommerceSubNav } from "@/features/ecommerce/components/EcommerceSubNav";
import { useEcommerceUnifiedReporting, useStoreAnalytics, useStoresList } from "@/features/ecommerce/hooks";
import { ReportingSubNav } from "@/features/reporting/components/ReportingSubNav";

function formatEuro(cents: number) {
  return `€${(cents / 100).toLocaleString("es-ES", { minimumFractionDigits: 0 })}`;
}

export function AnalyticsEcommerceClient() {
  const unifiedQuery = useEcommerceUnifiedReporting();
  const listQuery = useStoresList();
  const unified = unifiedQuery.data?.unified;
  const firstId = listQuery.data?.items?.[0]?.id ?? "";
  const firstAnalytics = useStoreAnalytics(firstId);

  return (
    <ProtectedLayout module="ecommerce">
      <div className="space-y-6">
        <ReportingSubNav />
        <EcommerceSubNav />

        {unifiedQuery.error ? (
          <ErrorNotice>
            <p>No pudimos cargar analytics de ecommerce.</p>
          </ErrorNotice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <EcommerceMetricCard
            label="Ingresos totales"
            loading={unifiedQuery.isLoading}
            value={formatEuro(unified?.total_revenue_cents ?? 0)}
          />
          <EcommerceMetricCard
            label="Conversión media"
            loading={unifiedQuery.isLoading}
            value={`${unified?.avg_conversion_rate ?? 0}%`}
          />
          <EcommerceMetricCard
            label="Abandono carrito"
            loading={unifiedQuery.isLoading}
            value={`${unified?.cart_abandonment_rate ?? 0}%`}
          />
          <EcommerceMetricCard
            label="ROAS ads"
            loading={unifiedQuery.isLoading}
            sub={`${unified?.email_campaigns ?? 0} campañas email`}
            value={`${(unified?.ads_roas ?? 0).toFixed(2)}x`}
          />
        </div>

        <PanelCard>
          <h2 className="text-base font-semibold">Carrito y checkout por tienda</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pedidos pendientes vs pagados — integrado con Publicidad y campañas Email del workspace.
          </p>
          <div className="mt-4">
            {firstId ? (
              <CartCheckoutChart analytics={firstAnalytics.data} />
            ) : (
              <p className="text-sm text-muted-foreground">Crea una tienda para ver analytics de checkout.</p>
            )}
          </div>
        </PanelCard>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/ecommerce/editor">Crear tienda</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/publicidad">Revisar ads</Link>
          </Button>
        </div>
      </div>
    </ProtectedLayout>
  );
}
