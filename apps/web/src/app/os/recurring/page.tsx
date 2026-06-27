"use client";

import { useEffect, useState } from "react";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";

type RunStatus = "queued" | "running" | "completed" | "failed" | "skipped";

type Run = {
  id: string;
  tenantId: string;
  serviceType: "seo" | "social" | "ads" | "reputation";
  periodKey: string;
  status: RunStatus;
  deliverableId: string | null;
  errorMessage: string | null;
  startedAt: string;
};

type Summary = { total: number; completed: number; failed: number; skipped: number; byService: Record<string, number> };

const STATUS_TONE: Record<RunStatus, "success" | "destructive" | "warning" | "neutral"> = {
  completed: "success",
  failed: "destructive",
  running: "warning",
  queued: "neutral",
  skipped: "neutral",
};

export default function OsRecurringPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggerTenant, setTriggerTenant] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 5000);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/os/recurring");
      if (res.ok) {
        const d = (await res.json()) as { summary: Summary; runs: Run[] };
        setSummary(d.summary);
        setRuns(d.runs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function trigger() {
    if (!triggerTenant.trim()) { flash("Introduce un tenant_id"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/os/recurring/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: triggerTenant.trim() }),
      });
      const d = (await res.json().catch(() => ({}))) as { generated?: number; error?: string };
      flash(res.ok ? `${d.generated ?? 0} entregable(s) generados para ${triggerTenant}` : d.error ?? "Error al ejecutar");
      if (res.ok) void load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Recurring Services</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ejecuciones mensuales SEO / social / ads / reputación por tenant — idempotentes por periodo.
          </p>
        </div>

        {notice && <div className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm">{notice}</div>}

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Runs (30d)</p><p className="text-2xl font-bold mt-1">{summary.total}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Completados</p><p className="text-2xl font-bold mt-1 text-green-500">{summary.completed}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Fallidos</p><p className="text-2xl font-bold mt-1 text-red-500">{summary.failed}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Omitidos (idemp.)</p><p className="text-2xl font-bold mt-1">{summary.skipped}</p></div>
          </div>
        )}

        {/* Manual trigger */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={triggerTenant}
            onChange={(e) => setTriggerTenant(e.target.value)}
            placeholder="tenant_id…"
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm w-56"
          />
          <Button disabled={busy} onClick={() => void trigger()}>
            {busy ? "Ejecutando…" : "Ejecutar ahora"}
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm py-12 text-center">Cargando runs…</p>
        ) : runs.length === 0 ? (
          <div className="rounded-xl border border-border p-10 text-center space-y-2">
            <p className="font-semibold">Sin ejecuciones recurring todavía</p>
            <p className="text-muted-foreground text-sm">
              Activa el Autopilot en algún tenant o lanza una ejecución manual. El cron mensual registrará aquí cada run.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                  <th className="px-4 py-3 text-left">Tenant</th>
                  <th className="px-4 py-3 text-left">Servicio</th>
                  <th className="px-4 py-3 text-left">Periodo</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Entregable</th>
                  <th className="px-4 py-3 text-left">Inicio</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="px-4 py-3 text-xs font-mono">{r.tenantId}</td>
                    <td className="px-4 py-3 text-xs">{r.serviceType}</td>
                    <td className="px-4 py-3 text-xs">{r.periodKey}</td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>{r.errorMessage && <span className="text-red-500 text-[10px] ml-1">{r.errorMessage}</span>}</td>
                    <td className="px-4 py-3 text-xs">
                      {r.deliverableId ? (
                        <a href={`/portal/deliverables?ref=${r.deliverableId}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver portal →</a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.startedAt).toLocaleString()}</td>
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
