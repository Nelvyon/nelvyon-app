"use client";

import { ExternalLink, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable, EliteModal } from "@/features/dashboard/components/DashboardTabs";

import { Button } from "@/core/ui/button";
import { osStoreApi } from "@/features/builders/api";
import { StatusBadge } from "@/features/builders/components/DashboardUi";
import type { StoreProject } from "@/features/builders/types";

export default function StoresDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<StoreProject[]>([]);
  const [modal, setModal] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [products, setProducts] = useState<{ name: string; description: string; price: number }[]>([
    { name: "", description: "", price: 0 },
  ]);
  const [form, setForm] = useState({ store_name: "", sector: "", currency: "EUR", country_code: "ES" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
    const res = await osStoreApi.list();
    setItems(res.items ?? []);
    } catch {
      /* preserved */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setItems([]));
  }, [load]);

  useEffect(() => {
    if (!generating) return;
    const t = setInterval(async () => {
      const p = await osStoreApi.get(generating);
      if (p.status === "ready" || p.status === "error") {
        setGenerating(null);
        load();
      }
    }, 3000);
    return () => clearInterval(t);
  }, [generating, load]);

  async function createStore() {
    const project = await osStoreApi.create({
      ...form,
      productos_iniciales: products.filter((p) => p.name),
    });
    await osStoreApi.generate(project.id);
    setGenerating(project.id);
    setModal(false);
    load();
  }

  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Tiendas</h1>
            <p className="text-sm text-muted-foreground">E-commerce generado con NELVYON OS + Stripe</p>
          </div>
          <Button onClick={() => setModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Crear nueva tienda
          </Button>
        </div>

        {generating ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">Generando tu tienda con IA…</div>
        ) : null}

        <DashboardListShell
          empty={!loading && items.length === 0}
          emptyActionLabel="Crear tienda"
          emptyDescription="Lanza tu primera tienda online con Stripe integrado."
          emptyTitle="Sin tiendas todavía"
          loading={loading}
          onEmptyAction={() => setModal(true)}
          skeleton={<SkeletonList />}
        >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <article className="rounded-xl border bg-card p-5 shadow-card" key={p.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">{p.name}</h2>
                </div>
                <StatusBadge status={p.status} />
              </div>
              {p.store_url ? (
                <a className="mt-2 flex items-center gap-1 text-xs text-link" href={p.store_url} rel="noreferrer" target="_blank">
                  {p.store_url} <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
              <div className="mt-4 flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/stores/${p.id}`}>Gestionar</Link>
                </Button>
                {p.status === "ready" ? (
                  <Button onClick={() => osStoreApi.publish(p.id).then(load)} size="sm">
                    Publicar
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        </DashboardListShell>
      </DashboardPageTransition>

      <EliteModal onClose={() => setModal(false)} open={modal} title="Nueva tienda" wide>
        <div className="grid gap-3">
          <input className="rounded-lg border px-3 py-2" onChange={(e) => setForm({ ...form, store_name: e.target.value })} placeholder="Nombre tienda" />
          <input className="rounded-lg border px-3 py-2" onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="Sector (moda, electrónica…)" />
          <select className="rounded-lg border px-3 py-2" onChange={(e) => setForm({ ...form, currency: e.target.value })} value={form.currency}>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
          <p className="text-sm font-medium">Productos iniciales</p>
          {products.map((prod, i) => (
            <div className="grid grid-cols-3 gap-2" key={i}>
              <input className="rounded border px-2 py-1" onChange={(e) => { const n = [...products]; n[i].name = e.target.value; setProducts(n); }} placeholder="Nombre" value={prod.name} />
              <input className="rounded border px-2 py-1" onChange={(e) => { const n = [...products]; n[i].description = e.target.value; setProducts(n); }} placeholder="Descripción" value={prod.description} />
              <input className="rounded border px-2 py-1" onChange={(e) => { const n = [...products]; n[i].price = Number(e.target.value); setProducts(n); }} placeholder="Precio" type="number" value={prod.price || ""} />
            </div>
          ))}
          <Button onClick={() => setProducts([...products, { name: "", description: "", price: 0 }])} variant="outline">
            + Producto
          </Button>
          <Button onClick={createStore}>Crear y generar</Button>
        </div>
      </EliteModal>
    </ProtectedLayout>
  );
}
