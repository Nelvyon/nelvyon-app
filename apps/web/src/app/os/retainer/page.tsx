"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";

type CycleStatus = "open" | "partial" | "verified" | "failed";

type Cycle = {
  id: string;
  tenantId: string;
  periodKey: string;
  status: CycleStatus;
  servicesExpected: string[];
  servicesDelivered: string[];
  verifiedAt: string | null;
};

type Summary = { open: number; partial: number; verified: number; failed: number; tenantsTracked: number; lastPeriod: string | null };

const STATUS_TONE: Record<CycleStatus, "success" | "warning" | "destructive" | "neutral"> = {
  verified: "success",
  partial: "warning",
  failed: "destructive",
  open: "neutral",
};

export default function OsRetainerPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function flash(msg: string) { setNotice(msg); setTimeout(() => setNotice(null), 5000); }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/os/retainer");
      if (!res.ok) { setError(`Error ${res.status} al cargar retainer`); return; }
      const d = (await res.json()) as { summary: Summary; cycles: Cycle[] };
      setSummary(d.summary);
      setCycles(d.cycles ?? []);
    } catch {
      setError("Error de red al cargar retainer");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function sync() {
    setBusy(true);
    try {
      const res = await fetch("/api/os/retainer/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const d = (await res.json().catch(() => ({}))) as { synced?: number };
      flash(res.ok ? `${d.synced ?? 0} tenants sincronizados` : "Error al sincronizar");
      if (res.ok) void load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Retainer Autopilot</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Ciclo mensual verificable por tenant — servicios esperados vs entregados.{" "}
              <Link href="/os/recurring" className="text-primary hover:underline">Recurring</Link>
              {" · "}<Link href="/saas/autopilot" className="text-primary hover:underline">Autopilot</Link>
            </p>
          </div>
          <Button disabled={busy} onClick={() => void sync()}>{busy ? "Sincronizando…" : "Sync ahora"}</Button>
        </div>

        {notice && <div className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm">{notice}</div>}
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Verified</p><p className="text-2xl font-bold mt-1 text-green-500">{summary.verified}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Partial</p><p className="text-2xl font-bold mt-1 text-yellow-500">{summary.partial}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Failed</p><p className="text-2xl font-bold mt-1 text-red-500">{summary.failed}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Tenants autopilot</p><p className="text-2xl font-bold mt-1">{summary.tenantsTracked}</p></div>
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground text-sm py-12 text-center">Cargando…</p>
        ) : cycles.length === 0 ? (
          <div className="rounded-xl border border-border p-10 text-center">
            <p className="text-muted-foreground text-sm">Sin ciclos aún. Activa Autopilot en algún tenant; el cron mensual los sincroniza.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-border text-muted-foreground text-xs uppercase">
                <th className="px-4 py-3 text-left">Tenant</th><th className="px-4 py-3 text-left">Periodo</th>
                <th className="px-4 py-3 text-left">Estado</th><th className="px-4 py-3 text-right">Entregado</th>
                <th className="px-4 py-3 text-left">Verificado</th>
              </tr></thead>
              <tbody>
                {cycles.map((c) => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="px-4 py-3 text-xs font-mono">{c.tenantId.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-xs">{c.periodKey}</td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge></td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{c.servicesDelivered.length}/{c.servicesExpected.length}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.verifiedAt ? new Date(c.verifiedAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
