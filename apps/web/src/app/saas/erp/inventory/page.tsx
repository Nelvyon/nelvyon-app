"use client";

/**
 * /saas/erp/inventory sobre `(cms)/content` de W3CRM, con las piezas ya
 * portadas. Mapeo: los dos formularios y el listado de saldos ->
 * `W3crmContentBox` + `W3crmDataTable`; KPIs -> `W3crmKpiTile`. Sin
 * componentes nuevos.
 *
 * Inventario: sin `data-testid`, sin spec dedicado (solo
 * `saas-nav-full-coverage`) y sin textos-contrato.
 *
 * Logica de NELVYON intacta: `GET/POST /api/saas/erp/inventory` con sus cinco
 * acciones (`create_product`, `create_warehouse`, `create_location`,
 * `receive`, `reserve`); el flujo de recepcion que crea producto, almacen y
 * ubicacion solo si faltan; la busqueda de saldo disponible antes de reservar;
 * las `idempotencyKey` de recepcion y reserva; el `orderRef` autogenerado; el
 * `datalist` de SKUs con saldo y el aviso de exito de 3 s.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable } from "@/features/saas-w3crm/components/W3crmContentBox";

type Balance = { productSku: string; locationId: string; available: number; reserved: number; inTransit: number };
type Location = { id: string; warehouseId: string; code: string };
type Warehouse = { id: string; code: string; name: string };
type Product = { sku: string; name: string; uom: string };

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

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
      const data = (await res.json().catch(() => ({}))) as {
        balances?: Balance[]; locations?: Location[]; warehouses?: Warehouse[];
        products?: Product[]; note?: string; error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setBalances(Array.isArray(data.balances) ? data.balances : []);
      setLocations(Array.isArray(data.locations) ? data.locations : []);
      setWarehouses(Array.isArray(data.warehouses) ? data.warehouses : []);
      setProducts(Array.isArray(data.products) ? data.products : []);
      setNote(data.note ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

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
        const d = (await r.json().catch(() => ({}))) as { error?: string };
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
        const d = (await r.json().catch(() => ({}))) as { warehouse?: Warehouse; error?: string };
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
        const d = (await r.json().catch(() => ({}))) as { location?: Location; error?: string };
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
      const d = (await r.json().catch(() => ({}))) as { error?: string };
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
      const bal = balances.find((b) => b.productSku === productSku && num(b.available) > 0);
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
      const d = (await r.json().catch(() => ({}))) as { error?: string };
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

  const availableTotal = balances.reduce((s, b) => s + num(b.available), 0);
  const reservedTotal = balances.reduce((s, b) => s + num(b.reserved), 0);

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Inventario & almacenes" parentTitle="Gestión" pageTitle="Inventario" />
      <div className="container-fluid">
        <div className="row">
          {error && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {error}
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setError(null)} />
              </div>
            </div>
          )}
          {ok && (
            <div className="col-xl-12">
              <div className="alert alert-success" role="status">{ok}</div>
            </div>
          )}

          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Productos" value={products.length} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Ubicaciones" value={locations.length} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Disponible" value={availableTotal} accent /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Reservado" value={reservedTotal} /></div>

          <div className="col-xl-12">
            <W3crmContentBox titulo="Recibir stock" icono="fa-solid fa-boxes-stacked">
              {note ? <p className="fs-12 text-muted">{note}</p> : null}
              <form onSubmit={(e) => void ensureAndReceive(e)}>
                <div className="row align-items-end">
                  <div className="col-xl-4 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="inv-sku" className="text-black font-w600">SKU <span className="required">*</span></label>
                      <input id="inv-sku" className="form-control" required value={sku} onChange={(e) => setSku(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-4 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="inv-nombre" className="text-black font-w600">Nombre (si nuevo)</label>
                      <input id="inv-nombre" className="form-control" value={productName} onChange={(e) => setProductName(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-2 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="inv-cantidad" className="text-black font-w600">Cantidad</label>
                      <input id="inv-cantidad" className="form-control" type="number" min={1} required
                        value={qty} onChange={(e) => setQty(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-2 col-sm-6">
                    <div className="form-group mb-3">
                      <button type="submit" className="btn btn-primary w-100" disabled={saving}>
                        {saving ? "Recibiendo…" : "Recibir stock"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </W3crmContentBox>

            <W3crmContentBox titulo="Reservar stock" icono="fa-solid fa-lock">
              <form onSubmit={(e) => void reserveStock(e)}>
                <div className="row align-items-end">
                  <div className="col-xl-4 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="inv-rsku" className="text-black font-w600">SKU <span className="required">*</span></label>
                      <input id="inv-rsku" className="form-control" required list="inv-skus"
                        value={reserveSku} onChange={(e) => setReserveSku(e.target.value)} />
                      <datalist id="inv-skus">
                        {balances.map((b) => (
                          <option key={`${b.productSku}-${b.locationId}`} value={b.productSku} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <div className="col-xl-3 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="inv-rcantidad" className="text-black font-w600">Cantidad</label>
                      <input id="inv-rcantidad" className="form-control" type="number" min={1} required
                        value={reserveQty} onChange={(e) => setReserveQty(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-3 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="inv-ref" className="text-black font-w600">Ref. pedido</label>
                      <input id="inv-ref" className="form-control" value={reserveRef} onChange={(e) => setReserveRef(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-2 col-sm-6">
                    <div className="form-group mb-3">
                      <button type="submit" className="btn btn-primary light w-100" disabled={saving || balances.length === 0}>
                        Reservar
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </W3crmContentBox>

            <W3crmContentBox titulo="Saldos" icono="fa-solid fa-warehouse">
              {loading ? (
                <W3crmCargando texto="Cargando saldos…" />
              ) : balances.length === 0 ? (
                <W3crmEmptyState
                  title="Sin saldos"
                  description="Recibe stock para crear producto y ubicación."
                />
              ) : (
                <W3crmDataTable
                  filas={balances}
                  etiqueta="saldos"
                  wrapperId="balances_wrapper"
                  porPagina={10}
                  columnas={[{ titulo: "SKU" }, { titulo: "Ubicación" }, { titulo: "Disponible" }, { titulo: "Reservado" }, { titulo: "En tránsito", alFinal: true }]}
                  render={(b) => (
                    <tr key={`${b.locationId}-${b.productSku}`}>
                      <td><span className="fw-bold">{b.productSku || "—"}</span></td>
                      <td><code className="fs-12">{String(b.locationId ?? "").slice(0, 8)}…</code></td>
                      <td>{num(b.available)}</td>
                      <td>{num(b.reserved)}</td>
                      <td className="text-end">{num(b.inTransit)}</td>
                    </tr>
                  )}
                />
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
