"use client";

import { useEffect, useMemo, useState } from "react";

import type { CreateInvoiceInput, InvoiceItemInput, InvoiceRecord, InvoiceStats, InvoiceStatus } from "@nelvyon/saas";

type Tab = "facturas" | "nueva" | "stats";

const statusClass: Record<InvoiceStatus, string> = {
  draft: "bg-slate-500/20 text-slate-300 border-slate-600",
  sent: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  overdue: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  void: "bg-zinc-700/50 text-zinc-300 border-zinc-600",
};

const statusLabel: Record<InvoiceStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  paid: "Pagada",
  overdue: "Vencida",
  void: "Anulada",
};

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function calcTotals(items: InvoiceItemInput[]): { subtotal: number; tax: number; total: number } {
  const subtotal = items.reduce((acc, it) => acc + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0);
  const tax = items.reduce((acc, it) => acc + Number(it.quantity || 0) * Number(it.unitPrice || 0) * (Number(it.taxRate || 0) / 100), 0);
  return { subtotal, tax, total: subtotal + tax };
}

export default function InvoicingDashboard() {
  const [tab, setTab] = useState<Tab>("facturas");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);

  const [previewHtml, setPreviewHtml] = useState("");
  const [previewInvoiceId, setPreviewInvoiceId] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [items, setItems] = useState<InvoiceItemInput[]>([{ description: "", quantity: 1, unitPrice: 0, taxRate: 21 }]);

  const totals = useMemo(() => calcTotals(items), [items]);

  async function loadInvoices(): Promise<void> {
    const res = await fetch("/api/saas/invoicing", { credentials: "include" });
    if (!res.ok) throw new Error("No se pudo cargar");
    const data = (await res.json()) as { invoices: InvoiceRecord[] };
    setInvoices(data.invoices ?? []);
  }

  async function loadStats(): Promise<void> {
    const res = await fetch("/api/saas/invoicing/stats", { credentials: "include" });
    if (!res.ok) throw new Error("No se pudo cargar stats");
    const data = (await res.json()) as { stats: InvoiceStats };
    setStats(data.stats);
  }

  useEffect(() => {
    loadInvoices().catch(() => setStatus("No se pudieron cargar facturas"));
  }, []);

  useEffect(() => {
    if (tab === "stats") loadStats().catch(() => setStatus("No se pudieron cargar stats"));
  }, [tab]);

  function updateItem(index: number, patch: Partial<InvoiceItemInput>): void {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem(): void {
    setItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0, taxRate: 21 }]);
  }

  function removeItem(index: number): void {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function createInvoice(): Promise<void> {
    setStatus("");
    setLoading(true);
    try {
      const input: CreateInvoiceInput = {
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientAddress: clientAddress.trim() || undefined,
        items: items.map((it) => ({
          description: it.description.trim(),
          quantity: Number(it.quantity || 0),
          unitPrice: Number(it.unitPrice || 0),
          taxRate: Number(it.taxRate || 0),
        })),
        currency: currency.trim().toUpperCase(),
        dueDate,
        notes: notes.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
      };
      const res = await fetch("/api/saas/invoicing/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as { invoice?: InvoiceRecord; error?: string };
      if (!res.ok) {
        setStatus(data.error ?? "No se pudo crear");
        return;
      }
      if (data.invoice) {
        setInvoices((prev) => [data.invoice as InvoiceRecord, ...prev]);
        setTab("facturas");
      }
    } finally {
      setLoading(false);
    }
  }

  async function previewInvoice(invoiceId: string): Promise<void> {
    const q = new URLSearchParams({ invoiceId });
    const res = await fetch(`/api/saas/invoicing/pdf?${q.toString()}`, { credentials: "include" });
    const data = (await res.json()) as { htmlContent?: string; error?: string };
    if (!res.ok) {
      setStatus(data.error ?? "No se pudo generar vista previa");
      return;
    }
    setPreviewInvoiceId(invoiceId);
    setPreviewHtml(data.htmlContent ?? "");
  }

  async function sendInvoice(invoiceId: string): Promise<void> {
    const res = await fetch("/api/saas/invoicing/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ invoiceId }),
    });
    const data = (await res.json()) as { invoice?: InvoiceRecord; error?: string };
    if (!res.ok) {
      setStatus(data.error ?? "No se pudo enviar");
      return;
    }
    if (data.invoice) setInvoices((prev) => prev.map((x) => (x.id === invoiceId ? data.invoice! : x)));
  }

  async function markPaid(invoiceId: string): Promise<void> {
    const res = await fetch("/api/saas/invoicing/paid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ invoiceId, paymentMethod: "manual" }),
    });
    const data = (await res.json()) as { invoice?: InvoiceRecord; error?: string };
    if (!res.ok) {
      setStatus(data.error ?? "No se pudo marcar pagada");
      return;
    }
    if (data.invoice) setInvoices((prev) => prev.map((x) => (x.id === invoiceId ? data.invoice! : x)));
  }

  async function sendReminder(invoiceId: string): Promise<void> {
    const res = await fetch("/api/saas/invoicing/reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ invoiceId }),
    });
    const data = (await res.json()) as { subject?: string; body?: string; error?: string };
    if (!res.ok) {
      setStatus(data.error ?? "No se pudo generar recordatorio");
      return;
    }
    setStatus(`Recordatorio generado: ${data.subject ?? "OK"}`);
  }

  return (
    <div className="min-h-[520px] rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Facturación automática cliente final</h2>
        <div className="flex gap-2 rounded-lg border border-slate-800 bg-slate-900/80 p-1">
          {(["facturas", "nueva", "stats"] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm ${tab === k ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}
              onClick={() => setTab(k)}
            >
              {k === "facturas" ? "Facturas" : k === "nueva" ? "Nueva Factura" : "Stats"}
            </button>
          ))}
        </div>
      </div>

      {status ? <p className="mb-3 text-sm text-amber-400">{status}</p> : null}

      {tab === "facturas" ? (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div key={inv.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`rounded-full border px-2.5 py-0.5 text-xs ${statusClass[inv.status]}`}>{statusLabel[inv.status]}</span>
                <span className="font-medium text-slate-200">{inv.invoiceNumber}</span>
                <span className="text-slate-400">{inv.clientName}</span>
                <span className="ml-auto font-semibold text-white">{formatMoney(inv.total, inv.currency)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Vence: {inv.dueDate}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-slate-600 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-800"
                  onClick={() => previewInvoice(inv.id).catch(() => setStatus("Error vista previa"))}
                >
                  Vista previa HTML
                </button>
                <button
                  type="button"
                  className="rounded border border-sky-500/40 px-2.5 py-1 text-xs text-sky-300 hover:bg-sky-900/30"
                  onClick={() => sendInvoice(inv.id).catch(() => setStatus("Error enviar"))}
                >
                  Enviar
                </button>
                <button
                  type="button"
                  className="rounded border border-emerald-500/40 px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-900/30"
                  onClick={() => markPaid(inv.id).catch(() => setStatus("Error pago"))}
                >
                  Marcar pagada
                </button>
                {inv.status === "overdue" ? (
                  <button
                    type="button"
                    className="rounded border border-rose-500/40 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-900/30"
                    onClick={() => sendReminder(inv.id).catch(() => setStatus("Error recordatorio"))}
                  >
                    Recordatorio
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {previewHtml && previewInvoiceId ? (
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4 md:p-6">
              <p className="mb-2 text-xs text-slate-400">Vista previa HTML ({previewInvoiceId})</p>
              <div className="max-h-[380px] overflow-auto rounded border border-slate-700 bg-white p-2 text-black" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "nueva" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm" placeholder="Nombre cliente" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm" placeholder="Email cliente" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm sm:col-span-2" placeholder="Dirección cliente (opcional)" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm" placeholder="Moneda (EUR, USD...)" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <input className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm sm:col-span-2" placeholder="Logo URL (opcional)" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-300">Items</p>
            {items.map((it, i) => (
              <div key={i} className="grid gap-2 rounded border border-slate-800 bg-slate-900/40 p-2 sm:grid-cols-12">
                <input className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs sm:col-span-5" placeholder="Descripción" value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} />
                <input className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs sm:col-span-2" type="number" step="0.01" placeholder="Qty" value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} />
                <input className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs sm:col-span-2" type="number" step="0.01" placeholder="Precio" value={it.unitPrice} onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })} />
                <input className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs sm:col-span-2" type="number" step="0.01" placeholder="IVA %" value={it.taxRate ?? 0} onChange={(e) => updateItem(i, { taxRate: Number(e.target.value) })} />
                <button type="button" className="rounded border border-rose-700 px-2 py-1 text-xs text-rose-300 sm:col-span-1" onClick={() => removeItem(i)}>
                  X
                </button>
              </div>
            ))}
            <button type="button" className="rounded border border-slate-600 px-3 py-1 text-xs text-slate-200" onClick={addItem}>
              Añadir línea
            </button>
          </div>

          <textarea className="min-h-[90px] w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm" placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 md:p-6 text-sm">
            <p>Subtotal: {formatMoney(totals.subtotal, currency || "EUR")}</p>
            <p>Impuestos: {formatMoney(totals.tax, currency || "EUR")}</p>
            <p className="font-semibold text-white">Total: {formatMoney(totals.total, currency || "EUR")}</p>
          </div>

          <button
            type="button"
            disabled={loading}
            className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
            onClick={() => createInvoice().catch(() => setStatus("Error creando factura"))}
          >
            {loading ? "Creando..." : "Crear factura draft"}
          </button>
        </div>
      ) : null}

      {tab === "stats" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-xs text-slate-500">Total facturado</p>
            <p className="mt-1 text-lg font-semibold text-white">{formatMoney(stats?.totalInvoiced ?? 0, "EUR")}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-xs text-slate-500">Cobrado</p>
            <p className="mt-1 text-lg font-semibold text-emerald-300">{formatMoney(stats?.paid ?? 0, "EUR")}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-xs text-slate-500">Pendiente</p>
            <p className="mt-1 text-lg font-semibold text-sky-300">{formatMoney(stats?.pending ?? 0, "EUR")}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-xs text-slate-500">Vencido</p>
            <p className="mt-1 text-lg font-semibold text-rose-300">{formatMoney(stats?.overdue ?? 0, "EUR")}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-xs text-slate-500">Días medios de pago</p>
            <p className="mt-1 text-lg font-semibold text-white">{(stats?.averagePaymentDays ?? 0).toFixed(1)}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
