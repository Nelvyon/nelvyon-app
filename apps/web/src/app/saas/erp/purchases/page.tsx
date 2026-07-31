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

type Supplier = { id: string; name: string; category: string; status: string; createdAt: string };
type PurchaseRequest = {
  id: string;
  status: string;
  lines: Array<{ sku: string; qty: number; uom: string }>;
  approvalLimitCents: number;
  createdAt: string;
};

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none";

function statusTone(s: string): "neutral" | "primary" | "success" | "warning" | "danger" {
  if (s === "approved") return "success";
  if (s === "submitted") return "primary";
  if (s === "rejected") return "danger";
  return "warning";
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
      const data = (await res.json()) as { error?: string };
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
      const data = (await res.json()) as { error?: string };
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
      const data = (await res.json()) as { error?: string };
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
    <SaasShellLayout sidebar={<SaasSidebar activeId="erp-purchases" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader
          title="Compras & proveedores"
          subtitle={note || "Persistido vía API · pagos/contabilidad fuera de alcance"}
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

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiTile icon="🏭" label="Proveedores" value={suppliers.length} />
          <KpiTile icon="📝" label="PRs" value={prs.length} />
          <KpiTile icon="✏️" label="Borradores" value={draftCount} />
          <KpiTile icon="📨" label="Enviadas" value={submittedCount} accent />
        </div>

        <NelvyonDsCard className="p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Nuevo proveedor</p>
          <form onSubmit={(e) => void createSupplier(e)} className="grid gap-3 sm:grid-cols-3">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre *" required />
            <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Categoría *" required />
            <NelvyonDsButton type="submit" disabled={saving} variant="primary">
              {saving ? "Creando…" : "Crear proveedor"}
            </NelvyonDsButton>
          </form>
        </NelvyonDsCard>

        <NelvyonDsCard className="p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Nueva solicitud de compra (PR)</p>
          <form onSubmit={(e) => void createPr(e)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input className={inputCls} value={prSku} onChange={(e) => setPrSku(e.target.value)} placeholder="SKU *" required />
            <input className={inputCls} type="number" min={1} value={prQty} onChange={(e) => setPrQty(e.target.value)} placeholder="Cantidad" required />
            <input className={inputCls} type="number" min={0} value={prLimit} onChange={(e) => setPrLimit(e.target.value)} placeholder="Techo aprobación (¢)" required />
            <NelvyonDsButton type="submit" disabled={saving} variant="primary">
              Crear PR
            </NelvyonDsButton>
          </form>
        </NelvyonDsCard>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Proveedores</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground" role="status">Cargando…</p>
          ) : suppliers.length === 0 ? (
            <NelvyonDsCard className="p-8 text-center text-sm text-muted-foreground">Sin proveedores aún.</NelvyonDsCard>
          ) : (
            <div className="flex flex-col gap-2">
              {suppliers.map((s) => (
                <NelvyonDsCard key={s.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.category}</p>
                  </div>
                  <NelvyonDsBadge tone="neutral">{s.status}</NelvyonDsBadge>
                </NelvyonDsCard>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Solicitudes de compra</h2>
          {prs.length === 0 ? (
            <NelvyonDsCard className="p-8 text-center text-sm text-muted-foreground">
              Sin PRs. Crea una arriba.
            </NelvyonDsCard>
          ) : (
            <div className="flex flex-col gap-2">
              {prs.map((pr) => (
                <NelvyonDsCard key={pr.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-foreground">{pr.id.slice(0, 8)}…</p>
                    <p className="text-xs text-muted-foreground">
                      {pr.lines.map((l) => `${l.sku}×${l.qty}`).join(", ")} · techo {pr.approvalLimitCents}¢
                    </p>
                  </div>
                  <NelvyonDsBadge tone={statusTone(pr.status)}>{pr.status}</NelvyonDsBadge>
                  {pr.status === "draft" && (
                    <NelvyonDsButton size="sm" variant="secondary" disabled={busyId === pr.id} onClick={() => void prAction("submit_pr", pr.id)}>
                      Enviar
                    </NelvyonDsButton>
                  )}
                  {pr.status === "submitted" && (
                    <NelvyonDsButton size="sm" variant="primary" disabled={busyId === pr.id} onClick={() => void prAction("approve_pr", pr.id)}>
                      Aprobar
                    </NelvyonDsButton>
                  )}
                </NelvyonDsCard>
              ))}
            </div>
          )}
        </section>
      </div>
    </SaasShellLayout>
  );
}
