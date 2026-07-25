"use client";

import { useCallback, useEffect, useState } from "react";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type Balance = { productSku: string; locationId: string; available: number; reserved: number; inTransit: number };
type Location = { id: string; warehouseId: string; code: string };
type Warehouse = { id: string; code: string; name: string };
type Product = { sku: string; name: string; uom: string };

export default function ErpInventoryPage() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sku, setSku] = useState("");
  const [productName, setProductName] = useState("");
  const [whCode, setWhCode] = useState("WH1");
  const [locCode, setLocCode] = useState("A-01");
  const [qty, setQty] = useState("10");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/erp/inventory");
      const data = (await res.json()) as {
        balances?: Balance[];
        locations?: Location[];
        warehouses?: Warehouse[];
        products?: Product[];
        note?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setBalances(data.balances ?? []);
      setLocations(data.locations ?? []);
      setWarehouses(data.warehouses ?? []);
      setProducts(data.products ?? []);
      setNote(data.note ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function ensureAndReceive(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const productSku = sku.trim();
      if (!productSku) {
        setError("SKU requerido");
        return;
      }

      if (!products.some((p) => p.sku === productSku)) {
        const r = await fetch("/api/saas/erp/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_product",
            sku: productSku,
            name: productName.trim() || productSku,
            uom: "u",
          }),
        });
        const d = (await r.json()) as { error?: string };
        if (!r.ok) {
          setError(d.error ?? `create_product HTTP ${r.status}`);
          return;
        }
      }

      let warehouseId = warehouses[0]?.id;
      if (!warehouseId) {
        const r = await fetch("/api/saas/erp/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create_warehouse", code: whCode, name: whCode }),
        });
        const d = (await r.json()) as { warehouse?: Warehouse; error?: string };
        if (!r.ok || !d.warehouse) {
          setError(d.error ?? `create_warehouse HTTP ${r.status}`);
          return;
        }
        warehouseId = d.warehouse.id;
      }

      let toLocId = locations.find((l) => l.warehouseId === warehouseId)?.id;
      if (!toLocId) {
        const r = await fetch("/api/saas/erp/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create_location", warehouseId, code: locCode }),
        });
        const d = (await r.json()) as { location?: Location; error?: string };
        if (!r.ok || !d.location) {
          setError(d.error ?? `create_location HTTP ${r.status}`);
          return;
        }
        toLocId = d.location.id;
      }

      const r = await fetch("/api/saas/erp/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "receive",
          productSku,
          toLocId,
          qty: Number(qty),
          idempotencyKey: `ui-recv-${productSku}-${Date.now()}`,
        }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) {
        setError(d.error ?? `receive HTTP ${r.status}`);
        return;
      }
      setSku("");
      setProductName("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="erp-inventory" />}>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <header>
          <h1 className="text-2xl font-semibold text-white">Inventario & almacenes</h1>
          <p className="mt-1 text-sm text-[#94a3b8]">
            Core in-memory · sin coste/GL · {note || "solo cantidades y trazabilidad"}
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={ensureAndReceive}
          className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="SKU *"
            className="rounded-lg border border-white/10 bg-[#020817] px-3 py-2 text-sm text-white"
            required
          />
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Nombre (si nuevo)"
            className="rounded-lg border border-white/10 bg-[#020817] px-3 py-2 text-sm text-white"
          />
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            type="number"
            min={1}
            placeholder="Cantidad"
            className="rounded-lg border border-white/10 bg-[#020817] px-3 py-2 text-sm text-white"
            required
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#0084ff] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Recibiendo…" : "Recibir stock"}
          </button>
        </form>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-[#94a3b8]">Saldos</h2>
          {loading ? (
            <p className="text-sm text-[#64748b]">Cargando…</p>
          ) : balances.length === 0 ? (
            <p className="text-sm text-[#64748b]">Sin saldos. Recibe stock para crear producto/ubicación.</p>
          ) : (
            <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
              {balances.map((b) => (
                <li
                  key={`${b.locationId}-${b.productSku}`}
                  className="flex justify-between px-4 py-3 text-sm text-white"
                >
                  <span>
                    {b.productSku} @ {b.locationId.slice(0, 8)}…
                  </span>
                  <span className="text-[#94a3b8]">
                    disp {b.available} · res {b.reserved} · tráns {b.inTransit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </SaasShellLayout>
  );
}
