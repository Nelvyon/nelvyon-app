"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";

type GapRunStatus = "running" | "completed" | "failed";

type GapRun = {
  id: string;
  ownDomain: string;
  competitorDomain: string;
  status: GapRunStatus;
  gapScore: number | null;
  recommendedPackId: string | null;
  launchId: string | null;
};

type Summary = { total: number; completed: number; avgGapScore: number; topRecommendedPack: string | null };

const STATUS_TONE: Record<GapRunStatus, "success" | "destructive" | "warning"> = {
  completed: "success",
  failed: "destructive",
  running: "warning",
};

export default function OsCompetitorGapPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [runs, setRuns] = useState<GapRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownDomain, setOwnDomain] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [sector, setSector] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function flash(msg: string) { setNotice(msg); setTimeout(() => setNotice(null), 5000); }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/os/competitor-gap");
      if (!res.ok) { setError(`Error ${res.status} al cargar análisis`); return; }
      const d = (await res.json()) as { summary: Summary; runs: GapRun[] };
      setSummary(d.summary);
      setRuns(d.runs ?? []);
    } catch {
      setError("Error de red al cargar análisis");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function analyze() {
    if (!ownDomain.trim() || !competitorUrl.trim()) { flash("Dominio propio y URL competidor requeridos"); return; }
    setBusy("analyze");
    try {
      const res = await fetch("/api/os/competitor-gap/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownDomain, competitorUrl, sector: sector || undefined }),
      });
      const d = (await res.json().catch(() => ({}))) as { run?: { gapScore?: number; recommendedPackId?: string }; error?: string };
      if (res.ok && d.run) {
        flash(`Gap score ${d.run.gapScore ?? 0} → ${d.run.recommendedPackId}`);
        void load();
      } else {
        flash(d.error ?? "Error al analizar");
      }
    } finally {
      setBusy(null);
    }
  }

  async function launch(run: GapRun) {
    setBusy(run.id);
    try {
      const res = await fetch(`/api/os/competitor-gap/${run.id}/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ execute: true }),
      });
      flash(res.ok ? `Pack ${run.recommendedPackId} lanzado` : "Error al lanzar el pack");
      if (res.ok) void load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Competitor Gap</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Dominio propio + URL competidor → brechas SEO/contenido/CRO + pack accionable.{" "}
            <Link href="/os/agent-data" className="text-primary hover:underline">Agent data</Link>
            {" · "}<Link href="/saas/brief-to-launch" className="text-primary hover:underline">Brief-to-Launch</Link>
          </p>
        </div>

        {notice && <div className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm">{notice}</div>}
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}

        {/* Form */}
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Tu dominio</label>
            <input value={ownDomain} onChange={(e) => setOwnDomain(e.target.value)} placeholder="tudominio.com" className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm w-48" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">URL competidor</label>
            <input value={competitorUrl} onChange={(e) => setCompetitorUrl(e.target.value)} placeholder="https://competidor.com" className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm w-56" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Sector (opcional)</label>
            <input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="ecommerce" className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm w-36" />
          </div>
          <Button disabled={busy !== null} onClick={() => void analyze()}>{busy === "analyze" ? "Analizando…" : "Analizar"}</Button>
        </div>

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Análisis</p><p className="text-2xl font-bold mt-1">{summary.total}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Gap score medio</p><p className="text-2xl font-bold mt-1">{summary.avgGapScore}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Pack más recomendado</p><p className="text-sm font-bold mt-1">{summary.topRecommendedPack ?? "—"}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Completados</p><p className="text-2xl font-bold mt-1">{summary.completed}</p></div>
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground text-sm py-12 text-center">Cargando…</p>
        ) : runs.length === 0 ? (
          <div className="rounded-xl border border-border p-10 text-center">
            <p className="text-muted-foreground text-sm">Sin análisis aún. Introduce un competidor y pulsa Analizar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-border text-muted-foreground text-xs uppercase">
                <th className="px-4 py-3 text-left">Tu dominio</th><th className="px-4 py-3 text-left">Competidor</th>
                <th className="px-4 py-3 text-right">Gap</th><th className="px-4 py-3 text-left">Pack recomendado</th>
                <th className="px-4 py-3 text-left">Estado</th><th className="px-4 py-3 text-right">Acciones</th>
              </tr></thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="px-4 py-3 text-xs">{r.ownDomain}</td>
                    <td className="px-4 py-3 text-xs">{r.competitorDomain}</td>
                    <td className="px-4 py-3 text-right"><span className={(r.gapScore ?? 0) >= 50 ? "text-red-500" : "text-yellow-500"}>{r.gapScore ?? "—"}</span></td>
                    <td className="px-4 py-3 text-xs text-primary">{r.recommendedPackId ?? "—"}{r.launchId && <Badge tone="success">launched</Badge>}</td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        {r.status === "completed" && <button onClick={() => setPreview(`/api/os/competitor-gap/${r.id}/html`)} className="text-primary text-xs hover:underline">Ver</button>}
                        {r.status === "completed" && r.recommendedPackId && !r.launchId && (
                          <button disabled={busy !== null} onClick={() => void launch(r)} className="text-green-500 text-xs hover:underline disabled:opacity-50">Lanzar pack</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreview(null)}>
            <div className="w-full max-w-2xl h-[80vh] rounded-xl overflow-hidden border border-border bg-background" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <span className="text-sm font-medium">Informe de brechas</span>
                <button onClick={() => setPreview(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
              </div>
              <iframe src={preview} className="w-full h-[calc(80vh-41px)]" title="Gap report" />
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
