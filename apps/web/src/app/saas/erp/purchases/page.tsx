"use client";

import { useCallback, useEffect, useState } from "react";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type Supplier = { id: string; name: string; category: string; status: string; createdAt: string };
type PurchaseRequest = {
  id: string;
  status: string;
  lines: Array<{ sku: string; qty: number; uom: string }>;
  approvalLimitCents: number;
  createdAt: string;
};

export default function ErpPurchasesPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [prs, setPrs] = useState<PurchaseRequest[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/erp/purchases");
      const data = (await res.json()) as {
        suppliers?: Supplier[];
        purchaseRequests?: PurchaseRequest[];
        note?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        setSuppliers([]);
        setPrs([]);
        return;
      }
      setSuppliers(data.suppliers ?? []);
      setPrs(data.purchaseRequests ?? []);
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
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setName("");
      setCategory("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="erp-purchases" />}>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <header>
          <h1 className="text-2xl font-semibold text-white">Compras & proveedores</h1>
          <p className="mt-1 text-sm text-[#94a3b8]">
            Core in-memory · sin pagos ni contabilidad · {note || "payments BLOCKED_SCOPE"}
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={createSupplier}
          className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-3"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre proveedor *"
            className="rounded-lg border border-white/10 bg-[#020817] px-3 py-2 text-sm text-white"
            required
          />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Categoría *"
            className="rounded-lg border border-white/10 bg-[#020817] px-3 py-2 text-sm text-white"
            required
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#0084ff] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Creando…" : "Crear proveedor"}
          </button>
        </form>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-[#94a3b8]">Proveedores</h2>
          {loading ? (
            <p className="text-sm text-[#64748b]">Cargando…</p>
          ) : suppliers.length === 0 ? (
            <p className="text-sm text-[#64748b]">Sin proveedores aún.</p>
          ) : (
            <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
              {suppliers.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-4 py-3 text-sm text-white">
                  <span>
                    {s.name} · <span className="text-[#94a3b8]">{s.category}</span>
                  </span>
                  <span className="text-xs text-[#64748b]">{s.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-[#94a3b8]">Solicitudes de compra (PR)</h2>
          {prs.length === 0 ? (
            <p className="text-sm text-[#64748b]">Sin PRs. Usa POST action=create_pr en la API.</p>
          ) : (
            <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
              {prs.map((pr) => (
                <li key={pr.id} className="px-4 py-3 text-sm text-white">
                  {pr.id.slice(0, 8)}… · {pr.status} · {pr.lines.length} líneas · techo{" "}
                  {pr.approvalLimitCents}¢
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </SaasShellLayout>
  );
}
