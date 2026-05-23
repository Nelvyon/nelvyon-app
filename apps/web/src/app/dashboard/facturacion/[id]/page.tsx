"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { dashboardInvoicesApi } from "@/features/dashboard/api";
import { StatusBadge } from "@/features/builders/components/DashboardUi";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function FacturaDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id ?? 0);
  const [invoice, setInvoice] = useState<Record<string, unknown> | null>(null);
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const data = await dashboardInvoicesApi.get(id);
    setInvoice(data);
    setClientName(String(data.client_name ?? ""));
    setClientEmail(String(data.client_email ?? ""));
    setNotes(String(data.notes ?? ""));
    const rawItems = (data.items as LineItem[] | undefined) ?? [];
    setItems(rawItems.length ? rawItems : [{ description: "", quantity: 1, unit_price: 0 }]);
  }, [id]);

  useEffect(() => {
    load().catch(() => setInvoice(null));
  }, [load]);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
    [items],
  );
  const ivaRate = Number(invoice?.iva_rate ?? 21);
  const iva = subtotal * (ivaRate / 100);
  const total = subtotal + iva;

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function save() {
    setSaving(true);
    try {
      await dashboardInvoicesApi.update(id, {
        client_name: clientName,
        client_email: clientEmail || undefined,
        items,
        notes: notes || undefined,
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function sendInvoice() {
    await dashboardInvoicesApi.send(id);
    load();
  }

  async function downloadPdf() {
    const blob = await dashboardInvoicesApi.pdf(id);
    downloadBlob(blob, `factura-${id}.pdf`);
  }

  const status = String(invoice?.status ?? "draft");
  const isDraft = status === "draft";

  return (
    <ProtectedLayout module="billing">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link className="text-sm text-muted-foreground" href="/dashboard/facturacion">
              ← Facturación
            </Link>
            <h1 className="text-2xl font-bold">{String(invoice?.invoice_number ?? `Factura #${id}`)}</h1>
            <StatusBadge status={status} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadPdf} variant="outline">
              PDF
            </Button>
            {isDraft ? (
              <Button onClick={sendInvoice} variant="outline">
                Enviar
              </Button>
            ) : null}
            <Button disabled={saving || !isDraft} onClick={save}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="rounded-lg border px-3 py-2"
            disabled={!isDraft}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Cliente"
            value={clientName}
          />
          <input
            className="rounded-lg border px-3 py-2"
            disabled={!isDraft}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="Email"
            type="email"
            value={clientEmail}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left">
                <th className="p-3">Descripción</th>
                <th className="p-3">Cant.</th>
                <th className="p-3">Precio</th>
                <th className="p-3">Subtotal</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((row, index) => (
                <tr className="border-b" key={index}>
                  <td className="p-2">
                    <input
                      className="w-full rounded border px-2 py-1"
                      disabled={!isDraft}
                      onChange={(e) => updateItem(index, { description: e.target.value })}
                      value={row.description}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className="w-20 rounded border px-2 py-1"
                      disabled={!isDraft}
                      min={1}
                      onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                      type="number"
                      value={row.quantity}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className="w-24 rounded border px-2 py-1"
                      disabled={!isDraft}
                      min={0}
                      onChange={(e) => updateItem(index, { unit_price: Number(e.target.value) })}
                      step="0.01"
                      type="number"
                      value={row.unit_price}
                    />
                  </td>
                  <td className="p-2">{(row.quantity * row.unit_price).toFixed(2)} €</td>
                  <td className="p-2">
                    {isDraft ? (
                      <button className="text-destructive" onClick={() => removeItem(index)} type="button">
                        ✕
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isDraft ? (
          <Button onClick={addItem} size="sm" variant="outline">
            + Línea
          </Button>
        ) : null}

        <textarea
          className="w-full rounded-lg border px-3 py-2"
          disabled={!isDraft}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas"
          rows={2}
          value={notes}
        />

        <div className="ml-auto max-w-xs space-y-1 text-right text-sm">
          <p>Subtotal: {subtotal.toFixed(2)} €</p>
          <p>IVA ({ivaRate}%): {iva.toFixed(2)} €</p>
          <p className="text-lg font-bold">Total: {total.toFixed(2)} €</p>
        </div>
      </div>
    </ProtectedLayout>
  );
}
