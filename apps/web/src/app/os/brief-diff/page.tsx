"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";

type DiffChange = { field: string; before: unknown; after: unknown; kind: string };
type Diff = {
  id: string;
  sourcePackRunId: string;
  newPackRunId: string | null;
  packId: string;
  changeCount: number;
  material: boolean;
  status: string;
  diff: DiffChange[];
  createdAt: string;
};
type Summary = { total: number; material: number; noChange: number; completed: number; failed: number; lastDiffAt: string | null };

const STATUS_TONE: Record<string, "success" | "destructive" | "warning" | "neutral"> = {
  completed: "success",
  failed: "destructive",
  compared: "warning",
  no_change: "neutral",
  rerunning: "warning",
  pending: "neutral",
};

export default function OsBriefDiffPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [diffs, setDiffs] = useState<Diff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sourceRunId, setSourceRunId] = useState("");
  const [valueProposition, setValueProposition] = useState("");
  const [primaryCta, setPrimaryCta] = useState("");
  const [sector, setSector] = useState("");
  const [lastDiff, setLastDiff] = useState<Diff | null>(null);
  const [newRunId, setNewRunId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/os/brief-diff");
      if (!res.ok) { setError(`Error ${res.status}`); return; }
      const d = (await res.json()) as { summary: Summary; diffs: Diff[] };
      setSummary(d.summary);
      setDiffs(d.diffs ?? []);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function compare(execute: boolean) {
    if (!sourceRunId.trim()) return;
    setBusy(true);
    setError(null);
    setNewRunId(null);
    try {
      const intake: Record<string, string> = {};
      if (valueProposition.trim()) intake.value_proposition = valueProposition.trim();
      if (primaryCta.trim()) intake.primary_cta = primaryCta.trim();
      if (sector.trim()) intake.sector = sector.trim();
      const res = await fetch(execute ? "/api/os/brief-diff/rerun" : "/api/os/brief-diff/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourcePackRunId: sourceRunId.trim(), intake, execute }),
      });
      const d = await res.json() as { diff?: Diff; newPackRunId?: string; error?: string };
      if (!res.ok) {
        setError(d.error ?? `Error ${res.status}`);
        return;
      }
      if (d.diff) setLastDiff(d.diff);
      if (d.newPackRunId) setNewRunId(d.newPackRunId);
      void load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Brief Diff &amp; Re-run</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compara cambios de brief vs un pack run y re-ejecuta el pack sin operador.{" "}
            <Link href="/os/agent-audit" className="text-primary hover:underline">Audit trail</Link>
            {" · "}<Link href="/os/certificates" className="text-primary hover:underline">Certificados</Link>
          </p>
        </div>

        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Diffs</p><p className="text-2xl font-bold">{summary.total}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Material</p><p className="text-2xl font-bold">{summary.material}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Sin cambio</p><p className="text-2xl font-bold">{summary.noChange}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Re-runs OK</p><p className="text-2xl font-bold">{summary.completed}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Fallidos</p><p className="text-2xl font-bold">{summary.failed}</p></div>
          </div>
        )}

        <div className="rounded-xl border border-border p-4 space-y-3">
          <h2 className="font-semibold">Comparar / Re-ejecutar</h2>
          <input value={sourceRunId} onChange={(e) => setSourceRunId(e.target.value)} placeholder="source pack_run_id (UUID)" className="w-full max-w-xl rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <div className="flex flex-wrap gap-2">
            <input value={valueProposition} onChange={(e) => setValueProposition(e.target.value)} placeholder="value_proposition (nuevo)" className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm flex-1 min-w-[200px]" />
            <input value={primaryCta} onChange={(e) => setPrimaryCta(e.target.value)} placeholder="primary_cta" className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm w-40" />
            <input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="sector" className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm w-32" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={() => void compare(false)}>Comparar</Button>
            <Button disabled={busy} onClick={() => void compare(true)}>Re-ejecutar pack</Button>
          </div>
        </div>

        {lastDiff && (
          <div className="rounded-xl border border-border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Último diff</h2>
              <Badge tone={STATUS_TONE[lastDiff.status] ?? "neutral"}>{lastDiff.status}</Badge>
              {lastDiff.material && <Badge tone="warning">material</Badge>}
            </div>
            {newRunId && (
              <p className="text-sm">
                Nuevo pack run:{" "}
                <Link href={`/os/agent-audit?packRunId=${newRunId}`} className="text-primary hover:underline font-mono">{newRunId}</Link>
              </p>
            )}
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground"><th className="py-1">Campo</th><th>Antes</th><th>Después</th></tr></thead>
              <tbody>
                {lastDiff.diff.map((c) => (
                  <tr key={c.field} className="border-t border-border/50">
                    <td className="py-1 font-mono">{c.field}</td>
                    <td className="text-muted-foreground truncate max-w-[200px]">{String(c.before ?? "—")}</td>
                    <td>{String(c.after ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30"><tr><th className="text-left p-3">Source run</th><th>Pack</th><th>Cambios</th><th>Status</th><th>New run</th><th>Fecha</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="p-4 text-muted-foreground">Cargando…</td></tr>}
              {!loading && diffs.length === 0 && <tr><td colSpan={6} className="p-4 text-muted-foreground">Sin diffs — ejecuta un growth pack y compara un brief aquí.</td></tr>}
              {diffs.map((d) => (
                <tr key={d.id} className="border-t border-border/50">
                  <td className="p-3 font-mono text-xs">{d.sourcePackRunId.slice(0, 8)}…</td>
                  <td className="p-3">{d.packId}</td>
                  <td className="p-3">{d.changeCount}{d.material ? " · mat." : ""}</td>
                  <td className="p-3"><Badge tone={STATUS_TONE[d.status] ?? "neutral"}>{d.status}</Badge></td>
                  <td className="p-3 font-mono text-xs">{d.newPackRunId ? `${d.newPackRunId.slice(0, 8)}…` : "—"}</td>
                  <td className="p-3 text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ProtectedLayout>
  );
}
