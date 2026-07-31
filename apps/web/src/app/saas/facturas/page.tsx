"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

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

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; tone: "primary" | "success" | "warning" | "danger" }> = {
  draft: { label: "Borrador", tone: "primary" },
  sent: { label: "Enviada", tone: "warning" },
  paid: { label: "Pagada", tone: "success" },
  overdue: { label: "Vencida", tone: "danger" },
  cancelled: { label: "Cancelada", tone: "danger" },
};

function openInvoicePdf(id: string) {
  window.open(`/api/saas/facturas/${id}/pdf`, "_blank", "noopener,noreferrer");
}


function fmt(s: string) { return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }); }

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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">{invoice ? `Factura ${invoice.number}` : "Nueva factura"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={saveAndSend} className="space-y-5 p-6">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Cliente *</label>
              <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre del cliente"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email cliente</label>
              <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="cliente@email.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Fecha vencimiento</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Líneas de factura</label>
              <button type="button" onClick={addLine} className="text-xs text-primary hover:underline">+ Añadir línea</button>
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/20">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Descripción</th>
                    <th className="w-16 px-3 py-2 text-center text-xs font-medium text-muted-foreground">Cant.</th>
                    <th className="w-24 px-3 py-2 text-right text-xs font-medium text-muted-foreground">Precio</th>
                    <th className="w-24 px-3 py-2 text-right text-xs font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <input value={l.description} onChange={e => updateLine(i, { description: e.target.value })} placeholder="Descripción del servicio"
                          className="w-full bg-transparent text-sm text-foreground focus:outline-none" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={1} value={l.qty} onChange={e => updateLine(i, { qty: Number(e.target.value) })}
                          className="w-full bg-transparent text-center text-sm text-foreground focus:outline-none" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} step={0.01} value={l.unitPrice} onChange={e => updateLine(i, { unitPrice: Number(e.target.value) })}
                          className="w-full bg-transparent text-right text-sm text-foreground focus:outline-none" />
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-medium text-foreground">€{(l.qty * l.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 space-y-1 text-right text-sm">
              <div className="flex justify-end gap-8 text-muted-foreground"><span>Subtotal</span><span>€{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-end gap-8 text-muted-foreground"><span>IVA (21%)</span><span>€{tax.toFixed(2)}</span></div>
              <div className="flex justify-end gap-8 text-lg font-bold text-foreground"><span>Total</span><span>€{total.toFixed(2)}</span></div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Condiciones de pago, IBAN, etc."
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="button" variant="ghost" disabled={saving || !clientName} onClick={() => void saveDraft()} className="flex-1">
              {saving ? "Guardando…" : "Guardar borrador"}
            </NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving || !clientName} className="flex-1">{saving ? "Enviando…" : "↗ Enviar"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
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

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="facturas" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="Facturación a Clientes" subtitle="Crea, envía y gestiona las facturas de tus clientes desde Nelvyon" />
              <NelvyonDsButton onClick={() => { setEditingInvoice(undefined); setShowModal(true); }}>+ Nueva factura</NelvyonDsButton>
            </div>

            {dunningSummary && dunningSummary.overdueCount > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 flex flex-wrap items-center gap-3">
                <span className="text-destructive font-medium text-sm">⚠️ Dunning activo</span>
                <span className="text-destructive/70 text-sm">{dunningSummary.overdueCount} facturas vencidas · €{dunningSummary.totalOverdueAmount.toFixed(0)}</span>
                <span className="ml-auto text-xs text-destructive/50">{dunningSummary.pendingAttempts} recordatorios pendientes</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Cobrado", value: `€${stats.paid.toFixed(0)}`, color: "text-success" },
                { label: "Pendiente cobro", value: `€${stats.pending.toFixed(0)}`, color: "text-warning" },
                { label: "Vencido", value: `€${stats.overdue.toFixed(0)}`, color: "text-destructive" },
                { label: "Total emitido", value: `€${stats.total.toFixed(0)}`, color: "text-foreground" },
              ].map(({ label, value, color }) => (
                <NelvyonDsCard key={label} className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
                </NelvyonDsCard>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap">
              {(["all", ...Object.keys(STATUS_CONFIG)] as const).map(s => (
                <button key={s} onClick={() => setFilterStatus(s as InvoiceStatus | "all")}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
                  {s === "all" ? "Todas" : STATUS_CONFIG[s as InvoiceStatus].label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/30" />)}</div>
            ) : invoices.length === 0 ? (
              <NelvyonDsCard className="p-16 text-center">
                <p className="text-5xl">🧾</p>
                <p className="mt-4 text-lg font-semibold text-foreground">Sin facturas</p>
                <p className="mt-2 text-sm text-muted-foreground">Crea tu primera factura y envíala directamente desde Nelvyon</p>
                <NelvyonDsButton className="mt-5" onClick={() => { setEditingInvoice(undefined); setShowModal(true); }}>+ Nueva factura</NelvyonDsButton>
              </NelvyonDsCard>
            ) : (
            <NelvyonDsCard className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {["Número", "Cliente", "Estado", "Total", "Emisión", "Vencimiento", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(inv => {
                    const sc = STATUS_CONFIG[inv.status];
                    return (
                      <tr key={inv.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-foreground">{inv.number}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{inv.clientName}</p>
                          <p className="text-xs text-muted-foreground">{inv.clientEmail}</p>
                        </td>
                        <td className="px-4 py-3"><NelvyonDsBadge tone={sc.tone}>{sc.label}</NelvyonDsBadge></td>
                        <td className="px-4 py-3 font-bold text-foreground">€{inv.total.toFixed(2)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmt(inv.issueDate)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmt(inv.dueDate)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <NelvyonDsButton variant="ghost" className="text-xs" onClick={() => { setEditingInvoice(inv); setShowModal(true); }}>Ver</NelvyonDsButton>
                            <NelvyonDsButton variant="ghost" className="text-xs" onClick={() => openInvoicePdf(inv.id)}>↓ PDF</NelvyonDsButton>
                            {inv.status === "draft" && (
                              <NelvyonDsButton
                                className="text-xs"
                                disabled={sendingId === inv.id}
                                onClick={() => void sendInvoice(inv.id)}
                              >
                                {sendingId === inv.id ? "Enviando…" : "↗ Enviar"}
                              </NelvyonDsButton>
                            )}
                            {inv.status === "overdue" && (
                              <NelvyonDsButton variant="ghost" className="text-xs text-destructive hover:text-destructive/80"
                                onClick={() => void fetch("/api/saas/facturas/dunning", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId: inv.id }) }).then(() => void load())}>
                                🔔 Recordatorio
                              </NelvyonDsButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </NelvyonDsCard>
            )}
      {showModal && <InvoiceModal invoice={editingInvoice} onClose={() => { setShowModal(false); void load(); }} />}
    </SaasShellLayout>
  );
}
