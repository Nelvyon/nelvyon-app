"use client";

/**
 * /saas/erp/purchases sobre `(cms)/content` de W3CRM, con las piezas ya
 * portadas. Mapeo: los dos formularios y los dos listados ->
 * `W3crmContentBox` + `W3crmDataTable`; KPIs -> `W3crmKpiTile`. Sin
 * componentes nuevos.
 *
 * Inventario: sin `data-testid`, sin spec dedicado (solo
 * `saas-nav-full-coverage`) y sin textos-contrato.
 *
 * Logica de NELVYON intacta: `GET/POST /api/saas/erp/purchases` con sus cuatro
 * acciones (`create_supplier`, `create_pr`, `submit_pr`, `approve_pr`), la
 * `idempotencyKey` que se genera al crear la PR, el `role: "admin"` que exige
 * la aprobacion, los cuatro estados con su color, el aviso de exito de 3 s y
 * los recuentos de borradores y enviadas.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable } from "@/features/saas-w3crm/components/W3crmContentBox";

type Supplier = { id: string; name: string; category: string; status: string; createdAt: string };
type PurchaseRequest = {
  id: string;
  status: string;
  lines: Array<{ sku: string; qty: number; uom: string }>;
  approvalLimitCents: number;
  createdAt: string;
};

/** Mismos estados que antes, ahora sobre badges de W3CRM. */
function statusBadge(s: string): string {
  if (s === "approved") return "badge-success";
  if (s === "submitted") return "badge-primary";
  if (s === "rejected") return "badge-danger";
  return "badge-warning";
}
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
/** `lines` puede llegar nula o no-array. */
function lineasDe(pr: PurchaseRequest): PurchaseRequest["lines"] {
  return Array.isArray(pr.lines) ? pr.lines : [];
}

export default function ErpPurchasesPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [prs, setPrs] = useState<PurchaseRequest[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [prSku, setPrSku] = useState("");
  const [prQty, setPrQty] = useState("1");
  const [prLimit, setPrLimit] = useState("10000");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/erp/purchases");
      const data = (await res.json().catch(() => ({}))) as {
        suppliers?: Supplier[]; purchaseRequests?: PurchaseRequest[]; note?: string; error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        setSuppliers([]);
        setPrs([]);
        return;
      }
      setSuppliers(Array.isArray(data.suppliers) ? data.suppliers : []);
      setPrs(Array.isArray(data.purchaseRequests) ? data.purchaseRequests : []);
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

  async function createSupplier(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/erp/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_supplier", name, category }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setName("");
      setCategory("");
      flash("Proveedor creado");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function createPr(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/erp/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_pr",
          lines: [{ sku: prSku.trim(), qty: Number(prQty), uom: "u" }],
          approvalLimitCents: Number(prLimit),
          idempotencyKey: `ui-pr-${prSku.trim()}-${Date.now()}`,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setPrSku("");
      flash("Solicitud de compra creada (borrador)");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function prAction(action: "submit_pr" | "approve_pr", id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/saas/erp/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          purchaseRequestId: id,
          role: action === "approve_pr" ? "admin" : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      flash(action === "submit_pr" ? "PR enviada" : "PR aprobada");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const draftCount = prs.filter((p) => p.status === "draft").length;
  const submittedCount = prs.filter((p) => p.status === "submitted").length;

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Compras & proveedores" parentTitle="Gestión" pageTitle="Compras" />
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

          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Proveedores" value={suppliers.length} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="PRs" value={prs.length} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Borradores" value={draftCount} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Enviadas" value={submittedCount} accent /></div>

          <div className="col-xl-12">
            <W3crmContentBox titulo="Nuevo proveedor" icono="fa-solid fa-industry">
              {note ? <p className="fs-12 text-muted">{note}</p> : null}
              <form onSubmit={(e) => void createSupplier(e)}>
                <div className="row align-items-end">
                  <div className="col-xl-5 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="pu-nombre" className="text-black font-w600">Nombre <span className="required">*</span></label>
                      <input id="pu-nombre" className="form-control" required value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-5 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="pu-categoria" className="text-black font-w600">Categoría <span className="required">*</span></label>
                      <input id="pu-categoria" className="form-control" required value={category} onChange={(e) => setCategory(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-2 col-sm-6">
                    <div className="form-group mb-3">
                      <button type="submit" className="btn btn-primary w-100" disabled={saving}>
                        {saving ? "Creando…" : "Crear proveedor"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </W3crmContentBox>

            <W3crmContentBox titulo="Nueva solicitud de compra (PR)" icono="fa-solid fa-file-invoice">
              <form onSubmit={(e) => void createPr(e)}>
                <div className="row align-items-end">
                  <div className="col-xl-4 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="pu-sku" className="text-black font-w600">SKU <span className="required">*</span></label>
                      <input id="pu-sku" className="form-control" required value={prSku} onChange={(e) => setPrSku(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-3 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="pu-cantidad" className="text-black font-w600">Cantidad</label>
                      <input id="pu-cantidad" className="form-control" type="number" min={1} required
                        value={prQty} onChange={(e) => setPrQty(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-3 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="pu-techo" className="text-black font-w600">Techo aprobación (¢)</label>
                      <input id="pu-techo" className="form-control" type="number" min={0} required
                        value={prLimit} onChange={(e) => setPrLimit(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-2 col-sm-6">
                    <div className="form-group mb-3">
                      <button type="submit" className="btn btn-primary w-100" disabled={saving}>Crear PR</button>
                    </div>
                  </div>
                </div>
              </form>
            </W3crmContentBox>

            <W3crmContentBox titulo="Proveedores" icono="fa-solid fa-truck">
              {loading ? (
                <W3crmCargando texto="Cargando proveedores…" />
              ) : suppliers.length === 0 ? (
                <W3crmEmptyState title="Sin proveedores aún" />
              ) : (
                <W3crmDataTable
                  filas={suppliers}
                  etiqueta="proveedores"
                  wrapperId="suppliers_wrapper"
                  porPagina={10}
                  columnas={[{ titulo: "Proveedor" }, { titulo: "Categoría" }, { titulo: "Estado", alFinal: true }]}
                  render={(s) => (
                    <tr key={s.id}>
                      <td><span className="fw-bold">{s.name || "—"}</span></td>
                      <td>{s.category || "—"}</td>
                      <td className="text-end"><span className="badge badge-secondary">{s.status || "—"}</span></td>
                    </tr>
                  )}
                />
              )}
            </W3crmContentBox>

            <W3crmContentBox titulo="Solicitudes de compra" icono="fa-solid fa-file-lines">
              {prs.length === 0 ? (
                <W3crmEmptyState title="Sin PRs" description="Crea una con el formulario de arriba." />
              ) : (
                <W3crmDataTable
                  filas={prs}
                  etiqueta="solicitudes"
                  wrapperId="prs_wrapper"
                  porPagina={10}
                  columnas={[{ titulo: "PR" }, { titulo: "Líneas" }, { titulo: "Techo" }, { titulo: "Estado" }, { titulo: "Gestión", alFinal: true }]}
                  render={(pr) => (
                    <tr key={pr.id}>
                      <td><code className="fs-12">{String(pr.id ?? "").slice(0, 8)}…</code></td>
                      <td>
                        <span className="text-muted fs-12">
                          {lineasDe(pr).map((l) => `${l.sku}×${num(l.qty)}`).join(", ") || "—"}
                        </span>
                      </td>
                      <td>{num(pr.approvalLimitCents)}¢</td>
                      <td><span className={`badge ${statusBadge(pr.status)}`}>{pr.status || "—"}</span></td>
                      <td className="text-end">
                        {pr.status === "draft" && (
                          <button type="button" className="btn btn-primary light btn-sm" disabled={busyId === pr.id}
                            aria-label={`Enviar PR ${String(pr.id ?? "").slice(0, 8)}`}
                            onClick={() => void prAction("submit_pr", pr.id)}>
                            Enviar
                          </button>
                        )}
                        {pr.status === "submitted" && (
                          <button type="button" className="btn btn-primary btn-sm" disabled={busyId === pr.id}
                            aria-label={`Aprobar PR ${String(pr.id ?? "").slice(0, 8)}`}
                            onClick={() => void prAction("approve_pr", pr.id)}>
                            Aprobar
                          </button>
                        )}
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
