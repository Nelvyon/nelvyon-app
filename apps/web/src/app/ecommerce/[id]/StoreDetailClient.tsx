"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import {
  CartCheckoutChart,
  EcommerceMetricCard,
} from "@/features/ecommerce/components/EcommercePanels";
import { EcommerceSubNav } from "@/features/ecommerce/components/EcommerceSubNav";
import { ecommerceApi } from "@/features/ecommerce/api";
import { usePublishStore, useStore, useStoreAnalytics } from "@/features/ecommerce/hooks";

function formatEuro(cents: number) {
  return `€${(cents / 100).toLocaleString("es-ES", { minimumFractionDigits: 2 })}`;
}

export function StoreDetailClient() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const storeQuery = useStore(id);
  const analyticsQuery = useStoreAnalytics(id);
  const publishMutation = usePublishStore(id);
  const store = storeQuery.data;
  const analytics = analyticsQuery.data;

  return (
    <ProtectedLayout module="ecommerce">
      <div className="space-y-6">
        <EcommerceSubNav />

        {storeQuery.error || analyticsQuery.error ? (
          <ErrorNotice>
            <p>No pudimos cargar el detalle de la tienda.</p>
          </ErrorNotice>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{store?.name ?? "Tienda"}</h1>
            <p className="text-sm text-muted-foreground">Estado: {store?.status ?? "—"}</p>
            {store?.store_url ? (
              <a className="text-sm text-link hover:underline" href={store.store_url} rel="noreferrer" target="_blank">
                Ver tienda pública
              </a>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={publishMutation.isPending || store?.status === "published"}
              onClick={() => void publishMutation.mutate()}
              size="sm"
              type="button"
            >
              Publicar tienda
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/publicidad">Publicidad</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/campaigns">Email</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <EcommerceMetricCard
            label="Ingresos"
            loading={analyticsQuery.isLoading}
            value={formatEuro(analytics?.total_revenue_cents ?? 0)}
          />
          <EcommerceMetricCard
            label="Visitas"
            loading={analyticsQuery.isLoading}
            value={String(analytics?.visits ?? 0)}
          />
          <EcommerceMetricCard
            label="Conversión"
            loading={analyticsQuery.isLoading}
            value={`${analytics?.conversion_rate ?? 0}%`}
          />
          <EcommerceMetricCard
            label="Productos"
            loading={storeQuery.isLoading}
            value={String(store?.products?.length ?? 0)}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <PanelCard>
            <h2 className="text-base font-semibold">Carrito y checkout</h2>
            <div className="mt-4">
              {analyticsQuery.isLoading ? (
                <SkeletonListRows rows={2} />
              ) : (
                <CartCheckoutChart analytics={analytics} />
              )}
            </div>
          </PanelCard>

          <PanelCard>
            <h2 className="text-base font-semibold">Productos</h2>
            {storeQuery.isLoading ? (
              <SkeletonListRows rows={4} />
            ) : (store?.products ?? []).length ? (
              <ul className="mt-3 divide-y divide-border text-sm">
                {(store?.products ?? []).map((p) => (
                  <li className="flex justify-between py-2" key={p.id}>
                    <span>{p.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatEuro(p.price_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Sin productos aún.</p>
            )}
            <Button
              className="mt-4"
              onClick={() =>
                void ecommerceApi
                  .addProduct(id, { name: "Nuevo producto", price: 29.99 })
                  .then(() => storeQuery.refetch())
              }
              size="sm"
              type="button"
              variant="outline"
            >
              Añadir producto
            </Button>
          </PanelCard>
        </div>
      </div>
    </ProtectedLayout>
  );
}
