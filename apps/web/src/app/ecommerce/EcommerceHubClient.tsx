"use client";

import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import {
  EcommerceMetricCard,
  StoreFunnelSteps,
} from "@/features/ecommerce/components/EcommercePanels";
import { EcommerceSubNav } from "@/features/ecommerce/components/EcommerceSubNav";
import { useEcommerceUnifiedReporting, useStoresList } from "@/features/ecommerce/hooks";

function formatEuro(cents: number) {
  return `€${(cents / 100).toLocaleString("es-ES", { minimumFractionDigits: 0 })}`;
}

export function EcommerceHubClient() {
  const unifiedQuery = useEcommerceUnifiedReporting();
  const listQuery = useStoresList();
  const unified = unifiedQuery.data?.unified;
  const items = listQuery.data?.items ?? [];

  return (
    <ProtectedLayout module="ecommerce">
      <div className="space-y-6">
        <EcommerceSubNav />

        {unifiedQuery.error instanceof ApiError && unifiedQuery.error.status === 403 ? (
          <ForbiddenNotice>
            <p>No tienes acceso a Ecommerce en este workspace.</p>
          </ForbiddenNotice>
        ) : null}
        {unifiedQuery.error && !(unifiedQuery.error instanceof ApiError && unifiedQuery.error.status === 403) ? (
          <ErrorNotice>
            <p>No pudimos cargar el resumen de ecommerce.</p>
          </ErrorNotice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <EcommerceMetricCard
            label="Tiendas"
            loading={unifiedQuery.isLoading}
            sub={`${unified?.published_stores ?? 0} publicadas`}
            value={String(unified?.total_stores ?? 0)}
          />
          <EcommerceMetricCard
            label="Ingresos"
            loading={unifiedQuery.isLoading}
            sub={`${unified?.paid_orders ?? 0} pedidos pagados`}
            value={formatEuro(unified?.total_revenue_cents ?? 0)}
          />
          <EcommerceMetricCard
            label="Conversión media"
            loading={unifiedQuery.isLoading}
            sub={`${unified?.total_visits ?? 0} visitas`}
            value={`${unified?.avg_conversion_rate ?? 0}%`}
          />
          <EcommerceMetricCard
            label="Abandono carrito"
            loading={unifiedQuery.isLoading}
            sub={`${unified?.pending_checkouts ?? 0} checkouts pendientes`}
            value={`${unified?.cart_abandonment_rate ?? 0}%`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PanelCard>
            <h2 className="text-base font-semibold">Integración Publicidad</h2>
            <p className="mt-1 text-xs text-muted-foreground">Inversión ads vinculada al funnel de tienda.</p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">Inversión</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">
                  {unifiedQuery.isLoading ? "…" : `€${(unified?.ads_spend ?? 0).toLocaleString("es-ES")}`}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">ROAS</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">
                  {unifiedQuery.isLoading ? "…" : `${(unified?.ads_roas ?? 0).toFixed(2)}x`}
                </dd>
              </div>
            </dl>
            <Button asChild className="mt-4" size="sm" variant="outline">
              <Link href="/publicidad">Ver publicidad</Link>
            </Button>
          </PanelCard>

          <PanelCard>
            <h2 className="text-base font-semibold">Integración Email</h2>
            <p className="mt-1 text-xs text-muted-foreground">Campañas de recuperación y promoción de catálogo.</p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">Campañas</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">
                  {unifiedQuery.isLoading ? "…" : unified?.email_campaigns ?? 0}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">Activas</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">
                  {unifiedQuery.isLoading ? "…" : unifiedQuery.data?.email?.active_campaigns ?? 0}
                </dd>
              </div>
            </dl>
            <Button asChild className="mt-4" size="sm" variant="outline">
              <Link href="/campaigns">Ver campañas email</Link>
            </Button>
          </PanelCard>
        </div>

        <PanelCard>
          <h2 className="text-base font-semibold">Funnel de compra</h2>
          <div className="mt-4">
            <StoreFunnelSteps />
          </div>
        </PanelCard>

        <PanelCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Tus tiendas</h2>
            <Button asChild size="sm">
              <Link href="/ecommerce/editor">Abrir editor</Link>
            </Button>
          </div>
          {listQuery.isLoading ? (
            <SkeletonListRows rows={3} />
          ) : items.length ? (
            <ul className="mt-3 divide-y divide-border">
              {items.slice(0, 6).map((s) => (
                <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={s.id}>
                  <div>
                    <Link className="font-medium text-link hover:underline" href={`/ecommerce/${s.id}`}>
                      {s.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{s.status}</p>
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/ecommerce/${s.id}`}>Ver analytics</Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Crea tu primera tienda con el editor y publica catálogo + checkout Stripe.
            </p>
          )}
        </PanelCard>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/ecommerce/editor">Nueva tienda</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/analytics/ecommerce">Analytics carrito y checkout</Link>
          </Button>
        </div>
      </div>
    </ProtectedLayout>
  );
}
