"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";

type GateStatus = "running" | "passed" | "failed";

type GateRun = { id: string; runKey: string; status: GateStatus; packsPassed: number; packsTotal: number; startedAt: string };
type GateSummary = { total: number; passed: number; failed: number; passRate: number; lastStatus: GateStatus | null };
type CertSummary = { passed: number; failed: number; pending: number; total: number };
type QaSummary = { passRate: number; total: number; blocked: number };

const STATUS_TONE: Record<GateStatus, "success" | "destructive" | "warning"> = {
  passed: "success",
  failed: "destructive",
  running: "warning",
};

export default function OsGatePage() {
  const [summary, setSummary] = useState<GateSummary | null>(null);
  const [runs, setRuns] = useState<GateRun[]>([]);
  const [cert, setCert] = useState<CertSummary | null>(null);
  const [qa, setQa] = useState<QaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function flash(msg: string) { setNotice(msg); setTimeout(() => setNotice(null), 5000); }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/os/gate");
      if (!res.ok) { setError(`Error ${res.status} al cargar el gate`); return; }
      const d = (await res.json()) as { summary: GateSummary; runs: GateRun[]; certifications: CertSummary | null; qaGate: QaSummary | null };
      setSummary(d.summary);
      setRuns(d.runs ?? []);
      setCert(d.certifications);
      setQa(d.qaGate);
    } catch {
      setError("Error de red al cargar el gate");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function runGate() {
    setBusy(true);
    try {
      const res = await fetch("/api/os/gate/run", { method: "POST" });
      const d = (await res.json().catch(() => ({}))) as { status?: string; packsPassed?: number };
      flash(res.ok ? `Gate ${d.status}: ${d.packsPassed ?? 0}/8 packs` : "Error al ejecutar el gate");
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
            <h1 className="text-2xl font-bold">OS Pack Gate</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gate bloqueante de los 8 packs (CI) + certificación + QA.{" "}
              <Link href="/os/packs/certifications" className="text-primary hover:underline">Certificaciones</Link>
              {" · "}
              <Link href="/os/qa" className="text-primary hover:underline">QA</Link>
            </p>
          </div>
          <Button disabled={busy} onClick={() => void runGate()}>
            {busy ? "Ejecutando…" : "Ejecutar gate local"}
          </Button>
        </div>

        {notice && <div className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm">{notice}</div>}
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Packs certificados</p><p className="text-2xl font-bold mt-1 text-green-500">{cert ? `${cert.passed}/${cert.total}` : "—"}</p></div>
          <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Gate pass rate</p><p className="text-2xl font-bold mt-1">{summary ? `${summary.passRate}%` : "—"}</p></div>
          <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Último gate</p><p className="text-sm font-bold mt-1">{summary?.lastStatus ?? "—"}</p></div>
          <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">QA pass rate 30d</p><p className="text-2xl font-bold mt-1">{qa ? `${qa.passRate}%` : "—"}</p></div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">Ejecuciones del gate</h2>
          {loading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Cargando…</p>
          ) : runs.length === 0 ? (
            <div className="rounded-xl border border-border p-8 text-center">
              <p className="text-muted-foreground text-sm">Sin ejecuciones de gate aún. El CI corre os-pack-gate.yml en cada push a main.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground text-xs uppercase">
                  <th className="px-4 py-3 text-left">Run key</th><th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Packs</th><th className="px-4 py-3 text-left">Inicio</th>
                </tr></thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="px-4 py-3 text-xs font-mono truncate max-w-[200px]">{r.runKey}</td>
                      <td className="px-4 py-3"><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{r.packsPassed}/{r.packsTotal}</td>
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
