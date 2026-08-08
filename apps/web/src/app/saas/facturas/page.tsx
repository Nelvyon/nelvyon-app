"use client";

/**
 * /saas/facturas sobre las pantallas `ecom-product-order` (lista) y
 * `ecom-invoice` (detalle) de la plantilla oficial W3CRM.
 *
 * Lista: marcado de `(ecommerce)/ecom-product-order/page.jsx` tal cual — `h-80`
 * > `container-fluid` > `row` > `col-lg-12` > `card` > `card-body` >
 * `table-responsive` > `table table-sm mb-0 table-responsive-lg`, `thead` en
 * `text-white bg-primary`, filas `btn-reveal-trigger`, celdas `py-2`, badges
 * `badge badge-sm badge-*` con `<span className="ms-1 fa fa-check">`, importes
 * en `text-end font-w600`, selector maestro `chackboxFun` y dropdown de tres
 * puntos `btn btn-primary i-false tp-btn-light sharp`.
 *
 * Detalle y alta: marcado de `(ecommerce)/ecom-invoice/page.jsx` — bloques
 * "De:"/"Para:", tabla de conceptos `table table-border` con `center` /
 * `left strong` / `right`, y el resumen en `table table-clear` dentro de
 * `col-lg-4 col-sm-5 ms-auto`.
 *
 * Logica de NELVYON intacta: tipos `Invoice`/`InvoiceLine`/`InvoiceStatus`, los
 * cinco estados, `openInvoicePdf`, `fmt`, `mapFactura`, `buildFacturaPayload`,
 * `InvoiceModal` y los endpoints `/api/saas/facturas`, `/dunning`,
 * `/api/saas/facturas/${id}` y `/api/saas/facturas/${id}/pdf`.
 */
import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Dropdown, Modal } from "react-bootstrap";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

interface InvoiceLine {
  description: string;
  qty: number;
  unitPrice: number;
}

interface Invoice {
  id: string;
  number: string;
  clientName: string;
  clientEmail: string;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  total: number;
  tax: number;
  issueDate: string;
  dueDate: string;
  paidAt: string | null;
  notes: string;
}

/** Tonos de badge de W3CRM para cada estado. */
const STATUS_CONFIG: Record<InvoiceStatus, { label: string; clase: string }> = {
  draft: { label: "Borrador", clase: "badge-primary" },
  sent: { label: "Enviada", clase: "badge-warning" },
  paid: { label: "Pagada", clase: "badge-success" },
  overdue: { label: "Vencida", clase: "badge-danger" },
  cancelled: { label: "Cancelada", clase: "badge-danger" },
};

/** Un estado fuera de los cinco conocidos no puede tumbar la fila. */
const ESTADO_DESCONOCIDO = { label: "Desconocido", clase: "badge-secondary" };

function estadoDe(status: InvoiceStatus | string): { label: string; clase: string } {
  return STATUS_CONFIG[status as InvoiceStatus] ?? ESTADO_DESCONOCIDO;
}

function openInvoicePdf(id: string) {
  window.open(`/api/saas/facturas/${id}/pdf`, "_blank", "noopener,noreferrer");
}

function fmt(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function mapFactura(raw: Record<string, unknown>): Invoice {
  const notes = raw.notes != null ? String(raw.notes) : "";
  let clientName = "";
  let clientEmail = "";
  const clientMatch = notes.match(/^Cliente:\s*(.+?)(?:\s*\(([^)]+)\))?\s*(?:\n|$)/);
  if (clientMatch) {
    clientName = clientMatch[1]?.trim() ?? "";
    clientEmail = clientMatch[2]?.trim() ?? "";
  }
  const cleanNotes = clientMatch ? notes.replace(clientMatch[0], "").trim() : notes;
  const lineItems = Array.isArray(raw.lineItems) ? raw.lineItems : (Array.isArray(raw.line_items) ? raw.line_items : []);
  return {
    id: String(raw.id),
    number: String(raw.invoiceNumber ?? raw.invoice_number ?? raw.number ?? ""),
    clientName,
    clientEmail,
    status: String(raw.status) as InvoiceStatus,
    lines: lineItems.map((l: Record<string, unknown>) => ({
      description: String(l.description ?? ""),
      qty: Number(l.quantity ?? l.qty ?? 1),
      unitPrice: Number(l.unitPrice ?? l.unit_price ?? 0),
    })),
    total: Number(raw.total ?? 0),
    tax: Number(raw.taxAmount ?? raw.tax_amount ?? raw.tax ?? 0),
    issueDate: String(raw.createdAt ?? raw.created_at ?? raw.issueDate ?? ""),
    dueDate: raw.dueDate != null ? String(raw.dueDate) : (raw.due_date != null ? String(raw.due_date) : ""),
    paidAt: raw.paidAt != null ? String(raw.paidAt) : (raw.paid_at != null ? String(raw.paid_at) : null),
    notes: cleanNotes,
  };
}

function buildFacturaPayload(clientName: string, clientEmail: string, dueDate: string, lines: InvoiceLine[], notes: string) {
  const lineItems = lines
    .filter(l => l.description.trim())
    .map(l => ({
      description: l.description.trim(),
      quantity: l.qty,
      unitPrice: l.unitPrice,
      total: Math.round(l.qty * l.unitPrice * 100) / 100,
    }));
  const clientLine = clientName.trim()
    ? `Cliente: ${clientName.trim()}${clientEmail.trim() ? ` (${clientEmail.trim()})` : ""}`
    : "";
  const combinedNotes = [clientLine, notes.trim()].filter(Boolean).join("\n") || undefined;
  return { lineItems, notes: combinedNotes, dueDate: dueDate || undefined, taxRate: 21 };
}

/**
 * Alta y edicion de factura en un `Modal` de react-bootstrap, con el cuerpo
 * tomado de `ecom-invoice`: bloques De:/Para:, conceptos en
 * `table table-border` y resumen en `table table-clear`.
 */
function InvoiceModal({ invoice, onClose }: { invoice?: Invoice; onClose: () => void }) {
  const [clientName, setClientName] = useState(invoice?.clientName ?? "");
  const [clientEmail, setClientEmail] = useState(invoice?.clientEmail ?? "");
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? "");
  const [lines, setLines] = useState<InvoiceLine[]>(invoice?.lines ?? [{ description: "", qty: 1, unitPrice: 0 }]);
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const tax = subtotal * 0.21;
  const total = subtotal + tax;

  function addLine() { setLines(l => [...l, { description: "", qty: 1, unitPrice: 0 }]); }
  function updateLine(i: number, upd: Partial<InvoiceLine>) { setLines(l => l.map((line, idx) => idx === i ? { ...line, ...upd } : line)); }

  async function persistDraft(): Promise<string | null> {
    const payload = buildFacturaPayload(clientName, clientEmail, dueDate, lines, notes);
    if (!payload.lineItems.length) throw new Error("Añade al menos una línea con descripción");

    if (invoice?.id) {
      const res = await fetch(`/api/saas/facturas/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      return invoice.id;
    }

    const res = await fetch("/api/saas/facturas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
      throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
    }
    const d = (await res.json()) as { factura?: Record<string, unknown> };
    return d.factura?.id != null ? String(d.factura.id) : null;
  }

  async function saveDraft(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await persistDraft();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar borrador");
    } finally {
      setSaving(false);
    }
  }

  async function saveAndSend(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const id = await persistDraft();
      if (!id) throw new Error("No se pudo guardar la factura");
      const res = await fetch(`/api/saas/facturas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sent" }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar factura");
    } finally {
      setSaving(false);
    }
  }

  const estado = invoice ? estadoDe(invoice.status) : null;

  return (
    <Modal className="modal fade" show onHide={onClose} size="lg" centered>
      <div className="modal-header">
        <h5 className="modal-title">{invoice ? `Factura ${invoice.number}` : "Nueva factura"}</h5>
        <button type="button" className="btn-close" onClick={onClose} aria-label="Cerrar" />
      </div>
      <div className="modal-body">
        <form onSubmit={saveAndSend} data-testid="factura-form">
          {error && <div className="alert alert-danger" role="alert">{error}</div>}

          {/* Cabecera de `ecom-invoice`: De: / Para: */}
          <div className="row mb-4">
            <div className="col-xl-6 col-lg-6 col-md-6 col-sm-6">
              <h6>De:</h6>
              <div><strong>NELVYON</strong></div>
              <div className="text-muted fs-13">Facturación a clientes</div>
              {estado && (
                <div className="mt-2">
                  <span className={`badge badge-sm ${estado.clase}`}>
                    {estado.label}
                    <span className="ms-1 fa fa-check" />
                  </span>
                </div>
              )}
            </div>
            <div className="col-xl-6 col-lg-6 col-md-6 col-sm-6">
              <h6>Para:</h6>
              <div className="mb-2">
                <label className="form-label fs-13" htmlFor="factura-cliente">Cliente *</label>
                <input
                  id="factura-cliente"
                  className="form-control"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Nombre del cliente"
                />
              </div>
              <div className="mb-2">
                <label className="form-label fs-13" htmlFor="factura-email">Email cliente</label>
                <input
                  id="factura-email"
                  type="email"
                  className="form-control"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  placeholder="cliente@email.com"
                />
              </div>
              <div>
                <label className="form-label fs-13" htmlFor="factura-vencimiento">Fecha vencimiento</label>
                <input
                  id="factura-vencimiento"
                  type="date"
                  className="form-control"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Conceptos — `table table-border` de `ecom-invoice` */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">Líneas de factura</h6>
            <button type="button" className="btn btn-primary light btn-sm" onClick={addLine}>
              + Añadir línea
            </button>
          </div>
          <div className="table-responsive">
            <table className="table table-border">
              <thead>
                <tr>
                  <th className="center">#</th>
                  <th>Descripción</th>
                  <th className="right">Precio</th>
                  <th className="center">Cant.</th>
                  <th className="right">Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i}>
                    <td className="center">{i + 1}</td>
                    <td className="left strong">
                      <input
                        className="form-control"
                        value={l.description}
                        onChange={e => updateLine(i, { description: e.target.value })}
                        placeholder="Descripción del servicio"
                        aria-label={`Descripción de la línea ${i + 1}`}
                      />
                    </td>
                    <td className="right">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="form-control"
                        value={l.unitPrice}
                        onChange={e => updateLine(i, { unitPrice: Number(e.target.value) })}
                        aria-label={`Precio de la línea ${i + 1}`}
                      />
                    </td>
                    <td className="center">
                      <input
                        type="number"
                        min={1}
                        className="form-control"
                        value={l.qty}
                        onChange={e => updateLine(i, { qty: Number(e.target.value) })}
                        aria-label={`Cantidad de la línea ${i + 1}`}
                      />
                    </td>
                    <td className="right">€{(l.qty * l.unitPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumen — `table table-clear` de `ecom-invoice` */}
          <div className="row">
            <div className="col-lg-4 col-sm-5"> </div>
            <div className="col-lg-4 col-sm-5 ms-auto">
              <table className="table table-clear">
                <tbody>
                  <tr>
                    <td className="left"><strong>Subtotal</strong></td>
                    <td className="right">€{subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="left"><strong>IVA (21%)</strong></td>
                    <td className="right">€{tax.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="left"><strong>Total</strong></td>
                    <td className="right"><strong>€{total.toFixed(2)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fs-13" htmlFor="factura-notas">Notas</label>
            <textarea
              id="factura-notas"
              className="form-control"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Condiciones de pago, IBAN, etc."
            />
          </div>

          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary light" onClick={onClose}>Cancelar</button>
            <button
              type="button"
              className="btn btn-primary light"
              disabled={saving || !clientName}
              onClick={() => void saveDraft()}
            >
              {saving ? "Guardando…" : "Guardar borrador"}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !clientName}>
              {saving ? "Enviando…" : "Enviar"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

/** Dropdown de acciones por fila — `DropdonBlog` de la plantilla. */
function AccionesFila({
  invoice,
  sendingId,
  onVer,
  onEnviar,
  onRecordatorio,
}: {
  invoice: Invoice;
  sendingId: string | null;
  onVer: () => void;
  onEnviar: () => void;
  onRecordatorio: () => void;
}) {
  return (
    <Dropdown className="text-sans-serif">
      <Dropdown.Toggle as="div" variant="" className="i-false">
        <button
          className="btn btn-primary i-false tp-btn-light sharp"
          type="button"
          aria-label={`Acciones de la factura ${invoice.number}`}
        >
          <span>
            <svg xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 24 24" version="1.1">
              <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <rect x="0" y="0" width="24" height="24"></rect>
                <circle fill="#000000" cx="12" cy="5" r="2"></circle>
                <circle fill="#000000" cx="12" cy="12" r="2"></circle>
                <circle fill="#000000" cx="12" cy="19" r="2"></circle>
              </g>
            </svg>
          </span>
        </button>
      </Dropdown.Toggle>
      <Dropdown.Menu className="dropdown-menu-right border py-0" align="end">
        <div className="py-2">
          <Link className="dropdown-item" href="#" scroll={false} onClick={(e) => { e.preventDefault(); onVer(); }}>
            Ver
          </Link>
          <Link
            className="dropdown-item"
            href="#"
            scroll={false}
            onClick={(e) => { e.preventDefault(); openInvoicePdf(invoice.id); }}
          >
            Descargar PDF
          </Link>
          {invoice.status === "draft" && (
            <Link className="dropdown-item" href="#" scroll={false} onClick={(e) => { e.preventDefault(); onEnviar(); }}>
              {sendingId === invoice.id ? "Enviando…" : "Enviar"}
            </Link>
          )}
          {invoice.status === "overdue" && (
            <Fragment>
              <div className="dropdown-divider" />
              <Link
                className="dropdown-item text-danger"
                href="#"
                scroll={false}
                onClick={(e) => { e.preventDefault(); onRecordatorio(); }}
              >
                Enviar recordatorio
              </Link>
            </Fragment>
          )}
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default function SaasFacturasPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>();
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | "all">("all");
  const [dunningSummary, setDunningSummary] = useState<{ overdueCount: number; totalOverdueAmount: number; pendingAttempts: number } | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, dRes] = await Promise.all([
        fetch("/api/saas/facturas"),
        fetch("/api/saas/facturas/dunning"),
      ]);
      if (res.ok) {
        const d = (await res.json()) as { facturas?: Record<string, unknown>[]; invoices?: Record<string, unknown>[] };
        setInvoices((d.facturas ?? d.invoices ?? []).map(mapFactura));
      } else {
        setInvoices([]);
      }
      if (dRes.ok) {
        const dd = await dRes.json() as { summary?: { overdueCount: number; totalOverdueAmount: number; pendingAttempts: number } };
        setDunningSummary(dd.summary ?? null);
      }
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function sendInvoice(id: string) {
    setSendingId(id);
    try {
      const res = await fetch(`/api/saas/facturas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sent" }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      await load();
    } catch {
      /* silencioso — fila permanece en borrador */
    } finally {
      setSendingId(null);
    }
  }

  const filtered = invoices.filter(i => filterStatus === "all" || i.status === filterStatus);

  const stats = {
    paid: invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0),
    pending: invoices.filter(i => i.status === "sent").reduce((s, i) => s + i.total, 0),
    overdue: invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.total, 0),
    total: invoices.reduce((s, i) => s + (i.status !== "cancelled" ? i.total : 0), 0),
  };

  /** Selector maestro de la plantilla (`chackboxFun`). */
  const chackboxFun = (type: string) => {
    setTimeout(() => {
      const chackbox = document.querySelectorAll<HTMLInputElement>(".product_order");
      const motherChackBox = document.querySelector<HTMLInputElement>(".product_order_single");
      if (!motherChackBox) return;
      for (let i = 0; i < chackbox.length; i++) {
        const element = chackbox[i];
        if (!element) continue;
        if (type === "all") {
          element.checked = motherChackBox.checked;
        } else if (!element.checked) {
          motherChackBox.checked = false;
          break;
        } else {
          motherChackBox.checked = true;
        }
      }
    }, 100);
  };

  // `summary` puede llegar sin campos numericos: sin esta normalizacion,
  // `totalOverdueAmount.toFixed()` tumbaba la pagina entera.
  const vencidas = Number(dunningSummary?.overdueCount ?? 0);
  const importeVencido = Number(dunningSummary?.totalOverdueAmount ?? 0);
  const recordatoriosPendientes = Number(dunningSummary?.pendingAttempts ?? 0);

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Facturación a clientes" parentTitle="Gestión" pageTitle="Facturas" />
      <div className="h-80">
        <div className="container-fluid">
          {vencidas > 0 && (
            <div className="alert alert-danger d-flex flex-wrap align-items-center gap-2" role="alert">
              <strong>Dunning activo</strong>
              <span>
                {vencidas} facturas vencidas · €{importeVencido.toFixed(0)}
              </span>
              <span className="ms-auto fs-13">{recordatoriosPendientes} recordatorios pendientes</span>
            </div>
          )}

          <div className="row">
            {[
              { label: "Cobrado", value: stats.paid, clase: "text-success" },
              { label: "Pendiente cobro", value: stats.pending, clase: "text-warning" },
              { label: "Vencido", value: stats.overdue, clase: "text-danger" },
              { label: "Total emitido", value: stats.total, clase: "" },
            ].map(({ label, value, clase }) => (
              <div className="col-xl-3 col-sm-6" key={label}>
                <div className="card">
                  <div className="card-body">
                    <span className="d-block text-muted fs-13 text-uppercase mb-1">{label}</span>
                    <h3 className={`mb-0 ${clase}`}>€{value.toFixed(0)}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="row">
            <div className="col-lg-12">
              <div className="card">
                <div className="card-header">
                  <h4 className="card-title">Facturas</h4>
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    {(["all", ...Object.keys(STATUS_CONFIG)] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        className={`btn btn-sm ${filterStatus === s ? "btn-primary" : "btn-primary light"}`}
                        onClick={() => setFilterStatus(s as InvoiceStatus | "all")}
                      >
                        {s === "all" ? "Todas" : estadoDe(s).label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn btn-primary btn-sm ms-2"
                      onClick={() => { setEditingInvoice(undefined); setShowModal(true); }}
                    >
                      + Nueva factura
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {loading ? (
                    <div className="d-flex align-items-center justify-content-center py-5" role="status">
                      <div className="spinner-border text-primary me-3" aria-hidden="true" />
                      <span className="text-muted">Cargando…</span>
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className="text-center py-5">
                      <h5 className="mb-1">Sin facturas</h5>
                      <p className="mb-3 text-muted fs-14">
                        Crea tu primera factura y envíala directamente desde NELVYON.
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => { setEditingInvoice(undefined); setShowModal(true); }}
                      >
                        + Nueva factura
                      </button>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm mb-0 table-responsive-lg ">
                        <thead className="text-white bg-primary">
                          <tr>
                            <th className="align-middle">
                              <div className="form-check custom-checkbox checkbox-success">
                                <input
                                  type="checkbox"
                                  className="form-check-input  product_order_single"
                                  id="checkAll"
                                  aria-label="Seleccionar todas las facturas"
                                  onClick={() => chackboxFun("all")}
                                />
                              </div>
                            </th>
                            <th className="align-middle">Factura</th>
                            <th className="align-middle pr-7">Emisión</th>
                            <th className="align-middle minw200">Vencimiento</th>
                            <th className="align-middle text-end">Estado</th>
                            <th className="align-middle text-end">Total</th>
                            <th className="no-sort text-end">Acción</th>
                          </tr>
                        </thead>
                        <tbody id="orders">
                          {filtered.map(inv => {
                            const sc = estadoDe(inv.status);
                            return (
                              <tr className="btn-reveal-trigger" key={inv.id}>
                                <td className="py-2">
                                  <div className="form-check custom-checkbox checkbox-success">
                                    <input
                                      type="checkbox"
                                      className="form-check-input product_order"
                                      aria-label={`Seleccionar factura ${inv.number}`}
                                      onClick={() => chackboxFun("")}
                                    />
                                  </div>
                                </td>
                                <td className="py-2">
                                  <strong>#{inv.number}</strong> por <strong>{inv.clientName || "—"}</strong>
                                  <br />
                                  {inv.clientEmail ? (
                                    <a href={`mailto:${inv.clientEmail}`}>{inv.clientEmail}</a>
                                  ) : (
                                    <span className="text-muted fs-13">Sin email</span>
                                  )}
                                </td>
                                <td className="py-2">{fmt(inv.issueDate)}</td>
                                <td className="py-2">
                                  {fmt(inv.dueDate)}
                                  <p className="mb-0 text-500">{inv.lines.length} línea(s)</p>
                                </td>
                                <td className="py-2 text-end">
                                  <span className={`badge badge-sm ${sc.clase}`}>
                                    {sc.label}
                                    <span className="ms-1 fa fa-check" />
                                  </span>
                                </td>
                                <td className="py-2 text-end font-w600">€{inv.total.toFixed(2)}</td>
                                <td className="py-2 text-end">
                                  <AccionesFila
                                    invoice={inv}
                                    sendingId={sendingId}
                                    onVer={() => { setEditingInvoice(inv); setShowModal(true); }}
                                    onEnviar={() => void sendInvoice(inv.id)}
                                    onRecordatorio={() => {
                                      void fetch("/api/saas/facturas/dunning", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ invoiceId: inv.id }),
                                      }).then(() => void load());
                                    }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && <InvoiceModal invoice={editingInvoice} onClose={() => { setShowModal(false); void load(); }} />}
    </SaasW3crmShell>
  );
}
