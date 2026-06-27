"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";

type RunStatus = "running" | "completed" | "failed" | "skipped";

type Run = {
  id: string;
  periodKey: string;
  triggerSource: string;
  status: RunStatus;
  ga4Users: number;
  sectorsUpdated: number;
  templatesRanked: number;
  seedsReranked: number;
  startedAt: string;
};

type TopSector = { sector: string; cvr: number; sessions: number; conversions: number };
type Summary = { total: number; completed: number; failed: number; skipped: number; avgSectorsUpdated: number };
type Ga4Status = { activeIntegrations: number; mode: "real" | "mock" | "none" };

const STATUS_TONE: Record<RunStatus, "success" | "destructive" | "warning" | "neutral"> = {
  completed: "success",
  failed: "destructive",
  running: "warning",
  skipped: "neutral",
};

export default function OsLearningPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [topSectors, setTopSectors] = useState<TopSector[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [ga4, setGa4] = useState<Ga4Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function flash(msg: string) { setNotice(msg); setTimeout(() => setNotice(null), 5000); }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/os/learning");
      if (!res.ok) { setError(`Error ${res.status} al cargar learning loop`); return; }
      const d = (await res.json()) as {
        summary: Summary; runs: Run[]; topSectors: TopSector[]; ga4Status: Ga4Status;
      };
      setSummary(d.summary);
      setRuns(d.runs ?? []);
      setTopSectors(d.topSectors ?? []);
      setGa4(d.ga4Status);
    } catch {
      setError("Error de red al cargar el learning loop");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function trigger() {
    setBusy(true);
    try {
      const res = await fetch("/api/os/learning/trigger", { method: "POST" });
      const d = (await res.json().catch(() => ({}))) as { status?: string; skipped?: boolean };
      flash(res.ok ? (d.skipped ? "Loop ya ejecutado este periodo (idempotente)" : `Loop ejecutado: ${d.status}`) : "Error al ejecutar el loop");
      if (res.ok) void load();
    } finally {
      setBusy(false);
    }
  }

  const lastRun = runs[0];

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Learning Loop</h1>
            <p className="text-muted-foreground text-sm mt-1">
              GA4 → pesos sectoriales → re-rank de templates y seeds.{" "}
              <Link href="/os/autonomous/learning" className="text-primary hover:underline">Ver detalle de templates →</Link>
            </p>
          </div>
          <Button disabled={busy} onClick={() => void trigger()}>
            {busy ? "Ejecutando…" : "Ejecutar loop manual"}
          </Button>
        </div>

        {notice && <div className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm">{notice}</div>}
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}

        {ga4 && (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            GA4: <strong>{ga4.activeIntegrations}</strong> integraciones activas · modo <Badge tone={ga4.mode === "real" ? "success" : ga4.mode === "mock" ? "warning" : "neutral"}>{ga4.mode}</Badge>
            {ga4.activeIntegrations === 0 && " — sin integraciones GA4 activas, el loop se omitirá"}
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Sectores actualizados (avg)</p><p className="text-2xl font-bold mt-1">{summary.avgSectorsUpdated}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Templates rankeados</p><p className="text-2xl font-bold mt-1">{lastRun?.templatesRanked ?? 0}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Seeds re-rankeados</p><p className="text-2xl font-bold mt-1">{lastRun?.seedsReranked ?? 0}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Último run</p><p className="text-sm font-bold mt-1">{lastRun ? `${lastRun.periodKey} · ${lastRun.status}` : "—"}</p></div>
          </div>
        )}

        {/* Top sectors */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">Top sectores por CVR</h2>
          {topSectors.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin pesos sectoriales todavía.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground text-xs uppercase">
                  <th className="px-4 py-3 text-left">Sector</th><th className="px-4 py-3 text-right">CVR</th>
                  <th className="px-4 py-3 text-right">Sessions</th><th className="px-4 py-3 text-right">Conversions</th>
                </tr></thead>
                <tbody>
                  {topSectors.map((s) => (
                    <tr key={s.sector} className="border-b border-border/50">
                      <td className="px-4 py-3">{s.sector}</td>
                      <td className="px-4 py-3 text-right text-green-500">{(s.cvr * 100).toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{s.sessions}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{s.conversions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Runs */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">Ejecuciones</h2>
          {loading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Cargando…</p>
          ) : runs.length === 0 ? (
            <div className="rounded-xl border border-border p-8 text-center">
              <p className="text-muted-foreground text-sm">Sin runs aún. Ejecuta el loop manual o espera al cron mensual.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground text-xs uppercase">
                  <th className="px-4 py-3 text-left">Periodo</th><th className="px-4 py-3 text-left">Origen</th>
                  <th className="px-4 py-3 text-left">Estado</th><th className="px-4 py-3 text-right">GA4</th>
                  <th className="px-4 py-3 text-right">Sectores</th><th className="px-4 py-3 text-right">Templates</th>
                  <th className="px-4 py-3 text-right">Seeds</th><th className="px-4 py-3 text-left">Inicio</th>
                </tr></thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="px-4 py-3 text-xs">{r.periodKey}</td>
                      <td className="px-4 py-3 text-xs">{r.triggerSource}</td>
                      <td className="px-4 py-3"><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{r.ga4Users}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{r.sectorsUpdated}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{r.templatesRanked}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{r.seedsReranked}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.startedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}
