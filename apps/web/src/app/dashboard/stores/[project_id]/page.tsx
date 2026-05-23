"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable } from "@/features/dashboard/components/DashboardTabs";

import { Button } from "@/core/ui/button";
import { osStoreApi } from "@/features/builders/api";
import { StatusBadge } from "@/features/builders/components/DashboardUi";
import type { StoreProduct, StoreProject } from "@/features/builders/types";

type Tab = "products" | "orders" | "analytics" | "config";

export default function StoreManagerPage() {
  const [loading, setLoading] = useState(true);
  const params = useParams<{ project_id: string }>();
  const id = params?.project_id ?? "";
  const [project, setProject] = useState<StoreProject | null>(null);
  const [tab, setTab] = useState<Tab>("products");
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!id) return;
    osStoreApi.get(id).then(setProject).catch(() => setProject(null));
  }, [id]);

  useEffect(() => {
    if (tab === "analytics" && id) osStoreApi.analytics(id).then(setAnalytics).catch(() => setAnalytics(null));
  }, [tab, id]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "products", label: "Productos" },
    { id: "orders", label: "Pedidos" },
    { id: "analytics", label: "Analytics" },
    { id: "config", label: "Configuración" },
  ];

  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div>
          <Link className="text-sm text-muted-foreground" href="/dashboard/stores">← Tiendas</Link>
          <h1 className="text-2xl font-bold">{project?.name}</h1>
          {project ? <StatusBadge status={project.status} /> : null}
        </div>

        <div className="flex gap-2 border-b">
          {tabs.map((t) => (
            <button
              className={`px-4 py-2 text-sm ${tab === t.id ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
              key={t.id}
              onClick={() => setTab(t.id)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "products" ? (
          <div className="space-y-4">
            <Button onClick={() => osStoreApi.addProduct(id, { name: "Nuevo producto", price: 29.99 }).then(() => osStoreApi.get(id).then(setProject))}>
              Añadir producto
            </Button>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Nombre</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(project?.products ?? []).map((p: StoreProduct) => (
                  <tr className="border-b" key={p.id}>
                    <td className="py-2">{p.name}</td>
                    <td>{(p.price_cents / 100).toFixed(2)} {p.currency}</td>
                    <td>{p.stock ?? 0}</td>
                    <td>{p.is_active ? "Activo" : "Inactivo"}</td>
                    <td>
                      <Button onClick={() => osStoreApi.deleteProduct(id, p.id).then(() => osStoreApi.get(id).then(setProject))} size="sm" variant="outline">
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "orders" ? (
          <p className="text-sm text-muted-foreground">Pedidos sincronizados desde Stripe webhook.</p>
        ) : null}

        {tab === "analytics" && analytics ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Ingresos</p>
              <p className="text-2xl font-bold">{((analytics.total_revenue_cents as number) / 100).toFixed(2)} €</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Conversión</p>
              <p className="text-2xl font-bold">{analytics.conversion_rate as number}%</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Visitas</p>
              <p className="text-2xl font-bold">{analytics.visits as number}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Pedidos pendientes</p>
              <p className="text-2xl font-bold">{analytics.pending_orders as number}</p>
            </div>
          </div>
        ) : null}

        {tab === "config" ? (
          <p className="text-sm text-muted-foreground">Dominio personalizado, colores y logo — próximamente en el editor visual.</p>
        ) : null}
      </DashboardPageTransition>
    </ProtectedLayout>
  );
}
