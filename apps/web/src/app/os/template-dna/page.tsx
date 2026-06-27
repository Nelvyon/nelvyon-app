"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";

type DnaScore = {
  seedId: string;
  sectorId: string;
  source: string | null;
  dnaScore: number;
  cvrComponent: number | null;
  qaComponent: number | null;
  rankComponent: number | null;
  packRuns: number;
  avgQaScore: number | null;
};

type Summary = { sectorsScored: number; seedsScored: number; lastComputedAt: string | null; topSector: string | null; avgDnaScore: number };

export default function OsTemplateDnaPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sectors, setSectors] = useState<string[]>([]);
  const [topSeeds, setTopSeeds] = useState<DnaScore[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [scores, setScores] = useState<DnaScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function flash(msg: string) { setNotice(msg); setTimeout(() => setNotice(null), 5000); }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/os/template-dna");
      if (!res.ok) { setError(`Error ${res.status} al cargar Template DNA`); return; }
      const d = (await res.json()) as { summary: Summary; topSeeds: DnaScore[]; sectors: string[] };
      setSummary(d.summary);
      setTopSeeds(d.topSeeds ?? []);
      setSectors(d.sectors ?? []);
    } catch {
      setError("Error de red al cargar Template DNA");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function loadSector(sectorId: string) {
    setSelected(sectorId);
    if (!sectorId) { setScores([]); return; }
    const res = await fetch(`/api/os/template-dna/${encodeURIComponent(sectorId)}`);
    if (res.ok) {
      const d = (await res.json()) as { scores: DnaScore[] };
      setScores(d.scores ?? []);
    }
  }

  async function refresh() {
    setBusy(true);
    try {
      const res = await fetch("/api/os/template-dna/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected ? { sectorId: selected } : {}),
      });
      flash(res.ok ? "DNA recalculado" : "Error al recalcular");
      if (res.ok) { void load(); if (selected) void loadSector(selected); }
    } finally {
      setBusy(false);
    }
  }

  const rows = selected ? scores : topSeeds;

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Template DNA</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Mejor plantilla por sector: GA4 CVR + QA de packs + learning rank.{" "}
              <Link href="/os/learning" className="text-primary hover:underline">Learning</Link>
              {" · "}<Link href="/os/seeds" className="text-primary hover:underline">Seeds</Link>
              {" · "}<Link href="/os/sectors" className="text-primary hover:underline">Sectores</Link>
            </p>
          </div>
          <Button disabled={busy} onClick={() => void refresh()}>{busy ? "Recalculando…" : "Refresh DNA"}</Button>
        </div>

        {notice && <div className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm">{notice}</div>}
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Seeds scored</p><p className="text-2xl font-bold mt-1">{summary.seedsScored}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">DNA medio</p><p className="text-2xl font-bold mt-1">{summary.avgDnaScore}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Top sector</p><p className="text-sm font-bold mt-1">{summary.topSector ?? "—"}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Último cálculo</p><p className="text-sm font-bold mt-1">{summary.lastComputedAt ? new Date(summary.lastComputedAt).toLocaleDateString() : "—"}</p></div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Sector</label>
          <select value={selected} onChange={(e) => void loadSector(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
            <option value="">Top global</option>
            {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm py-12 text-center">Cargando…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-border p-10 text-center">
            <p className="text-muted-foreground text-sm">Sin scores DNA. Ejecuta el learning loop o pulsa Refresh DNA.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-border text-muted-foreground text-xs uppercase">
                <th className="px-4 py-3 text-left">Seed</th><th className="px-4 py-3 text-left">Sector</th>
                <th className="px-4 py-3 text-left">Fuente</th><th className="px-4 py-3 text-right">DNA</th>
                <th className="px-4 py-3 text-right">CVR</th><th className="px-4 py-3 text-right">QA</th>
                <th className="px-4 py-3 text-right">Rank</th><th className="px-4 py-3 text-right">Pack runs</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.sectorId}-${r.seedId}`} className="border-b border-border/50">
                    <td className="px-4 py-3 text-xs font-mono">{r.seedId}</td>
                    <td className="px-4 py-3 text-xs">{r.sectorId}</td>
                    <td className="px-4 py-3"><Badge tone={r.source === "envato" ? "success" : "neutral"}>{r.source ?? "—"}</Badge></td>
                    <td className="px-4 py-3 text-right"><span className={r.dnaScore >= 70 ? "text-green-500 font-semibold" : "text-yellow-500"}>{r.dnaScore}</span></td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{r.cvrComponent !== null ? `${(r.cvrComponent * 100).toFixed(1)}%` : "—"}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{r.qaComponent ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{r.rankComponent ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{r.packRuns}</td>
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
