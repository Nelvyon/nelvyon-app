"use client";

import { useCallback, useEffect, useState } from "react";
import {
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
} from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { KpiTile } from "@/features/saas-shell/components/SaasDashboardWidgets";

type Balance = { productSku: string; locationId: string; available: number; reserved: number; inTransit: number };
type Location = { id: string; warehouseId: string; code: string };
type Warehouse = { id: string; code: string; name: string };
type Product = { sku: string; name: string; uom: string };

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none";

export default function ErpInventoryPage() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sku, setSku] = useState("");
  const [productName, setProductName] = useState("");
  const [qty, setQty] = useState("10");
  const [reserveSku, setReserveSku] = useState("");
  const [reserveQty, setReserveQty] = useState("1");
  const [reserveRef, setReserveRef] = useState("");
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

  function flash(msg: string) {
    setOk(msg);
    setError(null);
    window.setTimeout(() => setOk(null), 3000);
  }

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
          body: JSON.stringify({ action: "create_warehouse", code: "WH1", name: "WH1" }),
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
          body: JSON.stringify({ action: "create_location", warehouseId, code: "A-01" }),
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
      flash("Stock recibido");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function reserveStock(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const productSku = reserveSku.trim();
      const bal = balances.find((b) => b.productSku === productSku && b.available > 0);
      if (!bal) {
        setError("No hay saldo disponible para ese SKU");
        return;
      }
      const r = await fetch("/api/saas/erp/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reserve",
          productSku,
          locationId: bal.locationId,
          qty: Number(reserveQty),
          orderRef: reserveRef.trim() || `ORD-${Date.now()}`,
          idempotencyKey: `ui-rsv-${productSku}-${Date.now()}`,
        }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) {
        setError(d.error ?? `reserve HTTP ${r.status}`);
        return;
      }
      setReserveSku("");
      setReserveRef("");
      flash("Stock reservado");
      await load();
    } finally {
      setSaving(false);
    }
  }

  const availableTotal = balances.reduce((s, b) => s + b.available, 0);
  const reservedTotal = balances.reduce((s, b) => s + b.reserved, 0);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="erp-inventory" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader
          title="Inventario & almacenes"
          subtitle={note || "Persistido vía API · sin coste/GL"}
        />

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {ok && (
          <p className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary" role="status">
            {ok}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiTile icon="📦" label="Productos" value={products.length} />
          <KpiTile icon="📍" label="Ubicaciones" value={locations.length} />
          <KpiTile icon="✅" label="Disponible" value={availableTotal} accent />
          <KpiTile icon="🔒" label="Reservado" value={reservedTotal} />
        </div>

        <NelvyonDsCard className="p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Recibir stock</p>
          <form onSubmit={(e) => void ensureAndReceive(e)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input className={inputCls} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU *" required />
            <input className={inputCls} value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Nombre (si nuevo)" />
            <input className={inputCls} type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} required />
            <NelvyonDsButton type="submit" disabled={saving} variant="primary">
              {saving ? "Recibiendo…" : "Recibir stock"}
            </NelvyonDsButton>
          </form>
        </NelvyonDsCard>

        <NelvyonDsCard className="p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Reservar stock</p>
          <form onSubmit={(e) => void reserveStock(e)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input className={inputCls} value={reserveSku} onChange={(e) => setReserveSku(e.target.value)} placeholder="SKU *" required list="inv-skus" />
            <datalist id="inv-skus">
              {balances.map((b) => (
                <option key={`${b.productSku}-${b.locationId}`} value={b.productSku} />
              ))}
            </datalist>
            <input className={inputCls} type="number" min={1} value={reserveQty} onChange={(e) => setReserveQty(e.target.value)} required />
            <input className={inputCls} value={reserveRef} onChange={(e) => setReserveRef(e.target.value)} placeholder="Ref. pedido" />
            <NelvyonDsButton type="submit" disabled={saving || balances.length === 0} variant="secondary">
              Reservar
            </NelvyonDsButton>
          </form>
        </NelvyonDsCard>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Saldos</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground" role="status">Cargando…</p>
          ) : balances.length === 0 ? (
            <NelvyonDsCard className="p-8 text-center text-sm text-muted-foreground">
              Sin saldos. Recibe stock para crear producto/ubicación.
            </NelvyonDsCard>
          ) : (
            <div className="flex flex-col gap-2">
              {balances.map((b) => (
                <NelvyonDsCard key={`${b.locationId}-${b.productSku}`} className="flex justify-between gap-3 p-4">
                  <span className="text-sm text-foreground">
                    {b.productSku} @ {b.locationId.slice(0, 8)}…
                  </span>
                  <span className="text-xs text-muted-foreground">
                    disp {b.available} · res {b.reserved} · tráns {b.inTransit}
                  </span>
                </NelvyonDsCard>
              ))}
            </div>
          )}
        </section>
      </div>
    </SaasShellLayout>
  );
}
