"use client";

import { useCallback, useEffect, useState } from "react";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

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

export default function ErpManufacturingPage() {
  const [boms, setBoms] = useState<Bom[]>([]);
  const [mos, setMos] = useState<Mo[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
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
      const data = (await res.json()) as {
        boms?: Bom[];
        manufacturingOrders?: Mo[];
        note?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setBoms(data.boms ?? []);
      setMos(data.manufacturingOrders ?? []);
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
      const createData = (await createRes.json()) as { bom?: Bom; error?: string };
      if (!createRes.ok || !createData.bom) {
        setError(createData.error ?? `create_bom HTTP ${createRes.status}`);
        return;
      }

      const approveRes = await fetch("/api/saas/erp/manufacturing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_bom", bomId: createData.bom.id }),
      });
      const approveData = (await approveRes.json()) as { error?: string };
      if (!approveRes.ok) {
        setError(approveData.error ?? `approve_bom HTTP ${approveRes.status}`);
        return;
      }

      const moRes = await fetch("/api/saas/erp/manufacturing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_mo",
          bomId: createData.bom.id,
          qty: Number(moQty),
        }),
      });
      const moData = (await moRes.json()) as { error?: string };
      if (!moRes.ok) {
        setError(moData.error ?? `create_mo HTTP ${moRes.status}`);
        return;
      }

      setProductSku("");
      setComponentSku("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="erp-manufacturing" />}>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <header>
          <h1 className="text-2xl font-semibold text-white">Manufactura</h1>
          <p className="mt-1 text-sm text-[#94a3b8]">
            Persistido vía API (Postgres con DATABASE_URL) · IoT bloqueado · {note || "BOM → approve → MO"}
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={createBomFlow}
          className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <input
            value={productSku}
            onChange={(e) => setProductSku(e.target.value)}
            placeholder="SKU producto *"
            className="rounded-lg border border-white/10 bg-[#020817] px-3 py-2 text-sm text-white"
            required
          />
          <input
            value={componentSku}
            onChange={(e) => setComponentSku(e.target.value)}
            placeholder="SKU componente *"
            className="rounded-lg border border-white/10 bg-[#020817] px-3 py-2 text-sm text-white"
            required
          />
          <input
            value={compQty}
            onChange={(e) => setCompQty(e.target.value)}
            type="number"
            min={0.0001}
            step="any"
            placeholder="Qty componente"
            className="rounded-lg border border-white/10 bg-[#020817] px-3 py-2 text-sm text-white"
            required
          />
          <input
            value={moQty}
            onChange={(e) => setMoQty(e.target.value)}
            type="number"
            min={1}
            placeholder="Qty MO"
            className="rounded-lg border border-white/10 bg-[#020817] px-3 py-2 text-sm text-white"
            required
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#0084ff] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Creando…" : "BOM + aprobar + MO"}
          </button>
        </form>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-[#94a3b8]">Órdenes de fabricación</h2>
          {loading ? (
            <p className="text-sm text-[#64748b]">Cargando…</p>
          ) : mos.length === 0 ? (
            <p className="text-sm text-[#64748b]">Sin MOs.</p>
          ) : (
            <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
              {mos.map((mo) => (
                <li key={mo.id} className="flex justify-between px-4 py-3 text-sm text-white">
                  <span>
                    {mo.productSku} · qty {mo.qty}
                  </span>
                  <span className="text-[#94a3b8]">{mo.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-[#94a3b8]">BOMs</h2>
          {boms.length === 0 ? (
            <p className="text-sm text-[#64748b]">Sin BOMs.</p>
          ) : (
            <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
              {boms.map((b) => (
                <li key={b.id} className="flex justify-between px-4 py-3 text-sm text-white">
                  <span>
                    {b.productSku} v{b.version} · {b.lines.length} líneas
                  </span>
                  <span className="text-[#94a3b8]">{b.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </SaasShellLayout>
  );
}
