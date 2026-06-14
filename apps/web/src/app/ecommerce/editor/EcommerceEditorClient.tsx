"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { EcommerceSubNav } from "@/features/ecommerce/components/EcommerceSubNav";
import { StoreFunnelSteps } from "@/features/ecommerce/components/EcommercePanels";
import { ecommerceApi } from "@/features/ecommerce/api";
import { useCreateStore, useStoresList } from "@/features/ecommerce/hooks";

export function EcommerceEditorClient() {
  const router = useRouter();
  const listQuery = useStoresList();
  const createMutation = useCreateStore();
  const [generating, setGenerating] = useState<string | null>(null);
  const [form, setForm] = useState({
    store_name: "Mi tienda",
    sector: "retail",
    currency: "EUR",
    country_code: "ES",
  });
  const [products, setProducts] = useState([{ name: "Producto estrella", description: "", price: 29.99 }]);

  useEffect(() => {
    if (!generating) return;
    const t = setInterval(async () => {
      try {
        const p = await ecommerceApi.get(generating);
        if (p.status === "ready" || p.status === "error" || p.status === "published") {
          setGenerating(null);
          void listQuery.refetch();
          router.push(`/ecommerce/${generating}`);
        }
      } catch {
        setGenerating(null);
      }
    }, 3000);
    return () => clearInterval(t);
  }, [generating, listQuery, router]);

  async function createAndGenerate() {
    const project = await createMutation.mutateAsync({
      ...form,
      productos_iniciales: products.filter((p) => p.name),
    });
    await ecommerceApi.generate(project.id);
    setGenerating(project.id);
  }

  const items = listQuery.data?.items ?? [];

  return (
    <ProtectedLayout module="ecommerce">
      <div className="space-y-6">
        <EcommerceSubNav />

        {listQuery.error ? (
          <ErrorNotice>
            <p>No pudimos cargar tus tiendas.</p>
          </ErrorNotice>
        ) : null}

        {generating ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
            Generando tu tienda con IA…
          </div>
        ) : null}

        <PanelCard>
          <h2 className="text-base font-semibold">Editor de tienda</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea catálogo, landing ecommerce y checkout Stripe. Conecta tráfico desde Publicidad y Email.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              onChange={(e) => setForm({ ...form, store_name: e.target.value })}
              placeholder="Nombre de la tienda"
              value={form.store_name}
            />
            <input
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              onChange={(e) => setForm({ ...form, sector: e.target.value })}
              placeholder="Sector"
              value={form.sector}
            />
          </div>
          <div className="mt-4">
            <StoreFunnelSteps />
          </div>
          <Button
            className="mt-4"
            disabled={createMutation.isPending || Boolean(generating)}
            onClick={() => void createAndGenerate()}
            type="button"
          >
            {createMutation.isPending ? "Creando…" : "Crear y generar con IA"}
          </Button>
        </PanelCard>

        <PanelCard>
          <h2 className="text-base font-semibold">Tiendas existentes</h2>
          {listQuery.isLoading ? (
            <SkeletonListRows rows={4} />
          ) : items.length ? (
            <ul className="mt-3 divide-y divide-border">
              {items.map((s) => (
                <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={s.id}>
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.status}</p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/ecommerce/${s.id}`}>Editar tienda</Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Aún no hay tiendas en este workspace.</p>
          )}
        </PanelCard>
      </div>
    </ProtectedLayout>
  );
}
