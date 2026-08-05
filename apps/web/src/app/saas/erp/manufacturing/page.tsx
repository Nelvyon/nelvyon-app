"use client";

/**
 * /saas/erp/manufacturing sobre `(cms)/content` de W3CRM, con las piezas ya
 * portadas. Mapeo: alta de BOM+MO, ordenes de fabricacion y BOMs ->
 * `W3crmContentBox` + `W3crmDataTable`; KPIs -> `W3crmKpiTile`. Sin
 * componentes nuevos.
 *
 * Inventario: sin `data-testid`, sin spec dedicado (solo
 * `saas-nav-full-coverage`) y sin textos-contrato.
 *
 * Logica de NELVYON intacta: `GET/POST /api/saas/erp/manufacturing` con su
 * flujo encadenado de tres llamadas (`create_bom` -> `approve_bom` ->
 * `create_mo`), el manejo de error de cada paso por separado y el aviso de
 * exito de 3 s.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable } from "@/features/saas-w3crm/components/W3crmContentBox";

type Bom = {
  id: string;
  productSku: string;
  version: number;
  status: string;
  lines: Array<{ componentSku: string; qty: number; uom: string }>;
};
type Mo = {
  id: string;
  productSku: string;
  bomId: string;
  qty: number;
  status: string;
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
/** `lines` puede llegar nula o no-array. */
function lineasDe(b: Bom): Bom["lines"] {
  return Array.isArray(b.lines) ? b.lines : [];
}

export default function ErpManufacturingPage() {
  const [boms, setBoms] = useState<Bom[]>([]);
  const [mos, setMos] = useState<Mo[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [productSku, setProductSku] = useState("");
  const [componentSku, setComponentSku] = useState("");
  const [compQty, setCompQty] = useState("1");
  const [moQty, setMoQty] = useState("1");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/erp/manufacturing");
      const data = (await res.json().catch(() => ({}))) as {
        boms?: Bom[]; manufacturingOrders?: Mo[]; note?: string; error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setBoms(Array.isArray(data.boms) ? data.boms : []);
      setMos(Array.isArray(data.manufacturingOrders) ? data.manufacturingOrders : []);
      setNote(data.note ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createBomFlow(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const createRes = await fetch("/api/saas/erp/manufacturing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_bom",
          productSku,
          lines: [{ componentSku, qty: Number(compQty), uom: "u" }],
        }),
      });
      const createData = (await createRes.json().catch(() => ({}))) as { bom?: Bom; error?: string };
      if (!createRes.ok || !createData.bom) {
        setError(createData.error ?? `create_bom HTTP ${createRes.status}`);
        return;
      }

      const approveRes = await fetch("/api/saas/erp/manufacturing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_bom", bomId: createData.bom.id }),
      });
      const approveData = (await approveRes.json().catch(() => ({}))) as { error?: string };
      if (!approveRes.ok) {
        setError(approveData.error ?? `approve_bom HTTP ${approveRes.status}`);
        return;
      }

      const moRes = await fetch("/api/saas/erp/manufacturing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_mo", bomId: createData.bom.id, qty: Number(moQty) }),
      });
      const moData = (await moRes.json().catch(() => ({}))) as { error?: string };
      if (!moRes.ok) {
        setError(moData.error ?? `create_mo HTTP ${moRes.status}`);
        return;
      }

      setProductSku("");
      setComponentSku("");
      setOk("BOM aprobada y MO creada");
      window.setTimeout(() => setOk(null), 3000);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Manufactura" parentTitle="Gestión" pageTitle="Manufactura" />
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

          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="BOMs" value={boms.length} /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Órdenes MO" value={mos.length} accent /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="BOMs aprobadas" value={boms.filter((b) => b.status === "approved").length} /></div>

          <div className="col-xl-12">
            <W3crmContentBox titulo="Crear BOM + aprobar + MO" icono="fa-solid fa-industry">
              {note ? <p className="fs-12 text-muted">{note}</p> : null}
              <form onSubmit={(e) => void createBomFlow(e)}>
                <div className="row align-items-end">
                  <div className="col-xl-3 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="mf-producto" className="text-black font-w600">SKU producto <span className="required">*</span></label>
                      <input id="mf-producto" className="form-control" required
                        value={productSku} onChange={(e) => setProductSku(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-3 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="mf-componente" className="text-black font-w600">SKU componente <span className="required">*</span></label>
                      <input id="mf-componente" className="form-control" required
                        value={componentSku} onChange={(e) => setComponentSku(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-2 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="mf-cantcomp" className="text-black font-w600">Cant. componente</label>
                      <input id="mf-cantcomp" className="form-control" type="number" min={0.0001} step="any" required
                        value={compQty} onChange={(e) => setCompQty(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-2 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="mf-cantmo" className="text-black font-w600">Cantidad MO</label>
                      <input id="mf-cantmo" className="form-control" type="number" min={1} required
                        value={moQty} onChange={(e) => setMoQty(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-2 col-sm-6">
                    <div className="form-group mb-3">
                      <button type="submit" className="btn btn-primary w-100" disabled={saving}>
                        {saving ? "Creando…" : "BOM + MO"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </W3crmContentBox>

            <W3crmContentBox titulo="Órdenes de fabricación" icono="fa-solid fa-gears">
              {loading ? (
                <W3crmCargando texto="Cargando órdenes…" />
              ) : mos.length === 0 ? (
                <W3crmEmptyState title="Sin órdenes de fabricación" />
              ) : (
                <W3crmDataTable
                  filas={mos}
                  etiqueta="órdenes"
                  wrapperId="mos_wrapper"
                  porPagina={10}
                  columnas={[{ titulo: "Producto" }, { titulo: "Cantidad" }, { titulo: "Estado", alFinal: true }]}
                  render={(mo) => (
                    <tr key={mo.id}>
                      <td><span className="fw-bold">{mo.productSku || "—"}</span></td>
                      <td>{num(mo.qty)}</td>
                      <td className="text-end"><span className="badge badge-primary">{mo.status || "—"}</span></td>
                    </tr>
                  )}
                />
              )}
            </W3crmContentBox>

            <W3crmContentBox titulo="BOMs" icono="fa-solid fa-list-check">
              {boms.length === 0 ? (
                <W3crmEmptyState title="Sin BOMs" />
              ) : (
                <W3crmDataTable
                  filas={boms}
                  etiqueta="BOMs"
                  wrapperId="boms_wrapper"
                  porPagina={10}
                  columnas={[{ titulo: "Producto" }, { titulo: "Versión" }, { titulo: "Líneas" }, { titulo: "Estado", alFinal: true }]}
                  render={(b) => (
                    <tr key={b.id}>
                      <td><span className="fw-bold">{b.productSku || "—"}</span></td>
                      <td>v{num(b.version)}</td>
                      <td>{lineasDe(b).length}</td>
                      <td className="text-end">
                        <span className={`badge ${b.status === "approved" ? "badge-success" : "badge-warning"}`}>
                          {b.status || "—"}
                        </span>
                      </td>
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
