"use client";

import { useCallback, useEffect, useState } from "react";
import {
  NelvyonDsBadge,
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
} from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { KpiTile } from "@/features/saas-shell/components/SaasDashboardWidgets";

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

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none";

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
      setOk("BOM aprobada y MO creada");
      window.setTimeout(() => setOk(null), 3000);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="erp-manufacturing" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader
          title="Manufactura"
          subtitle={note || "BOM → aprobar → orden de fabricación · IoT bloqueado"}
        />

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {ok && (
          <p className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary" role="status">
            {ok}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <KpiTile icon="📋" label="BOMs" value={boms.length} />
          <KpiTile icon="⚙️" label="Órdenes MO" value={mos.length} accent />
          <KpiTile icon="✅" label="BOMs aprobadas" value={boms.filter((b) => b.status === "approved").length} />
        </div>

        <NelvyonDsCard className="p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Crear BOM + aprobar + MO</p>
          <form onSubmit={(e) => void createBomFlow(e)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input className={inputCls} value={productSku} onChange={(e) => setProductSku(e.target.value)} placeholder="SKU producto *" required />
            <input className={inputCls} value={componentSku} onChange={(e) => setComponentSku(e.target.value)} placeholder="SKU componente *" required />
            <input className={inputCls} type="number" min={0.0001} step="any" value={compQty} onChange={(e) => setCompQty(e.target.value)} required />
            <input className={inputCls} type="number" min={1} value={moQty} onChange={(e) => setMoQty(e.target.value)} required />
            <NelvyonDsButton type="submit" disabled={saving} variant="primary">
              {saving ? "Creando…" : "BOM + MO"}
            </NelvyonDsButton>
          </form>
        </NelvyonDsCard>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Órdenes de fabricación</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground" role="status">Cargando…</p>
          ) : mos.length === 0 ? (
            <NelvyonDsCard className="p-8 text-center text-sm text-muted-foreground">Sin MOs.</NelvyonDsCard>
          ) : (
            <div className="flex flex-col gap-2">
              {mos.map((mo) => (
                <NelvyonDsCard key={mo.id} className="flex justify-between gap-3 p-4">
                  <span className="text-sm text-foreground">
                    {mo.productSku} · qty {mo.qty}
                  </span>
                  <NelvyonDsBadge tone="primary">{mo.status}</NelvyonDsBadge>
                </NelvyonDsCard>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">BOMs</h2>
          {boms.length === 0 ? (
            <NelvyonDsCard className="p-8 text-center text-sm text-muted-foreground">Sin BOMs.</NelvyonDsCard>
          ) : (
            <div className="flex flex-col gap-2">
              {boms.map((b) => (
                <NelvyonDsCard key={b.id} className="flex justify-between gap-3 p-4">
                  <span className="text-sm text-foreground">
                    {b.productSku} v{b.version} · {b.lines.length} líneas
                  </span>
                  <NelvyonDsBadge tone={b.status === "approved" ? "success" : "warning"}>{b.status}</NelvyonDsBadge>
                </NelvyonDsCard>
              ))}
            </div>
          )}
        </section>
      </div>
    </SaasShellLayout>
  );
}
