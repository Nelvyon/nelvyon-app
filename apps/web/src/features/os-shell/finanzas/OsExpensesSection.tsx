"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";

import { ApiError } from "@/core/api/types";
import { useOsPermissions } from "@/features/os-shell/hooks/useOsPermissions";
import { OsEmptyState, OsStatusBadge, OsTable } from "@/features/os-shell/components/ui/OsUi";

import { osExpensesApi } from "./expensesApi";
import type { OsExpense } from "./expenseTypes";

function expenseTone(status: string): "neutral" | "success" | "warning" | "danger" {
  switch ((status ?? "").toLowerCase()) {
    case "pagado":
      return "success";
    case "pendiente":
      return "warning";
    case "cancelado":
      return "danger";
    default:
      return "neutral";
  }
}

export function OsExpensesSection({
  expenses,
  onReload,
}: {
  expenses: OsExpense[];
  onReload: () => void;
}) {
  const perms = useOsPermissions();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const n = parseFloat(amount.replace(",", "."));
    if (!title.trim() || Number.isNaN(n) || n <= 0) {
      setError("Título y importe válido son obligatorios");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await osExpensesApi.create({
        title: title.trim(),
        amount: n,
        currency: "EUR",
        status: "pendiente",
        expense_date: today,
      });
      setTitle("");
      setAmount("");
      onReload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al crear gasto");
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (id: number) => {
    if (!perms.canEdit) return;
    try {
      await osExpensesApi.update(id, {
        status: "pagado",
        paid_at: new Date().toISOString().slice(0, 10),
      });
      onReload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al marcar pagado");
    }
  };

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/45">
        Gastos operativos
      </h2>

      {perms.canEdit ? (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
          <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs text-white/50">
            Concepto
            <input
              className="rounded border border-white/15 bg-[#0b1428] px-3 py-2 text-sm text-white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="flex w-28 flex-col gap-1 text-xs text-white/50">
            Importe (EUR)
            <input
              className="rounded border border-white/15 bg-[#0b1428] px-3 py-2 text-sm text-white"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleCreate()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0084FF] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Añadir gasto
          </button>
        </div>
      ) : null}

      {error ? <p className="mb-2 text-sm text-red-400">{error}</p> : null}

      {expenses.length === 0 ? (
        <OsEmptyState
          title="Sin datos todavía"
          description="Registra gastos operativos (proveedores, herramientas, subcontratas). Al marcarlos como pagados se reflejan en el flujo de caja."
        />
      ) : (
        <OsTable>
          <thead>
            <tr className="border-b border-white/10 text-xs text-white/45">
              <th className="px-4 py-2">Concepto</th>
              <th className="px-4 py-2">Importe</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {expenses.slice(0, 50).map((ex) => (
              <tr key={ex.id} className="border-b border-white/5">
                <td className="px-4 py-2 text-white">{ex.title}</td>
                <td className="px-4 py-2 text-white/80">
                  {Number(ex.amount).toLocaleString("es-ES")} {ex.currency}
                </td>
                <td className="px-4 py-2">
                  <OsStatusBadge label={ex.status} tone={expenseTone(ex.status)} />
                </td>
                <td className="px-4 py-2 text-white/50">
                  {ex.expense_date ?? ex.paid_at ?? "—"}
                </td>
                <td className="px-4 py-2">
                  {perms.canEdit && (ex.status ?? "").toLowerCase() === "pendiente" ? (
                    <button
                      type="button"
                      className="text-xs text-[#0084FF] hover:underline"
                      onClick={() => void markPaid(ex.id)}
                    >
                      Marcar pagado
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </OsTable>
      )}
    </section>
  );
}
