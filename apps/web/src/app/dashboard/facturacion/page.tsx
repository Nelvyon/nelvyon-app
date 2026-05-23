"use client";

import { Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { dashboardInvoicesApi } from "@/features/dashboard/api";
import { DashboardTabs, MetricGrid, DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable, EliteModal } from "@/features/dashboard/components/DashboardTabs";
import { StatusBadge } from "@/features/builders/components/DashboardUi";

interface InvoiceRow {
  id: number;
  invoice_number?: string;
  client_name?: string;
  total?: number;
  status?: string;
  currency?: string;
}

export default function FacturacionDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InvoiceRow[]>([]);
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    description: "",
    quantity: 1,
    unit_price: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
    const [listRes, statsRes] = await Promise.all([
      dashboardInvoicesApi.list(),
      dashboardInvoicesApi.stats(),
    ]);
    setItems((listRes.items as unknown as InvoiceRow[]) ?? []);
    setStats(statsRes);
    } catch {
      /* preserved */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {
      setItems([]);
      setStats({});
    });
  }, [load]);

  async function create() {
    await dashboardInvoicesApi.create({
      client: {
        client_name: form.client_name,
        client_email: form.client_email || undefined,
      },
      items: [{ description: form.description || "Servicio", quantity: form.quantity, unit_price: form.unit_price }],
    });
    setModal(false);
    setForm({ client_name: "", client_email: "", description: "", quantity: 1, unit_price: 0 });
    load();
  }

  const metrics = [
    { label: "Total facturado", value: String(stats.total_facturado ?? 0) },
    { label: "Pendiente", value: String(stats.pendiente ?? 0) },
    { label: "Pagado", value: String(stats.pagado ?? 0) },
    { label: "Borradores", value: String(stats.draft_count ?? 0) },
  ];

  return (
    <ProtectedLayout module="billing">
      <DashboardPageTransition>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Facturación</h1>
            <p className="text-sm text-muted-foreground">Facturas con IVA y PDF legal</p>
          </div>
          <Button onClick={() => setModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nueva factura
          </Button>
        </div>

        <MetricGrid items={metrics} loading={loading} />

        <DashboardListShell
          empty={!loading && items.length === 0}
          emptyActionLabel="Nueva factura"
          emptyDescription="Crea tu primera factura o presupuesto."
          emptyTitle="Sin facturas"
          loading={loading}
          onEmptyAction={() => setModal(true)}
          skeleton={<SkeletonList />}
        >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((inv) => (
            <article className="rounded-xl border bg-card p-5 shadow-card" key={inv.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">{inv.invoice_number ?? `#${inv.id}`}</h2>
                </div>
                <StatusBadge status={inv.status ?? "draft"} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{inv.client_name ?? "—"}</p>
              <p className="mt-1 text-lg font-bold">
                {inv.total ?? 0} {inv.currency ?? "EUR"}
              </p>
              <div className="mt-4">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/facturacion/${inv.id}`}>Editar</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
        </DashboardListShell>
      </DashboardPageTransition>

      <EliteModal onClose={() => setModal(false)} open={modal} title="Nueva factura" wide>
        <div className="grid gap-3">
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
            placeholder="Nombre del cliente"
            value={form.client_name}
          />
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, client_email: e.target.value })}
            placeholder="Email del cliente"
            type="email"
            value={form.client_email}
          />
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descripción del servicio"
            value={form.description}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="rounded-lg border px-3 py-2"
              min={1}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              placeholder="Cantidad"
              type="number"
              value={form.quantity}
            />
            <input
              className="rounded-lg border px-3 py-2"
              min={0}
              onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })}
              placeholder="Precio unitario"
              step="0.01"
              type="number"
              value={form.unit_price}
            />
          </div>
          <Button disabled={!form.client_name} onClick={create}>
            Crear factura
          </Button>
        </div>
      </EliteModal>
    </ProtectedLayout>
  );
}
