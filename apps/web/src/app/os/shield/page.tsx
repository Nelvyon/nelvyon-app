"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";

type ShieldStatus = "pending" | "passed" | "blocked" | "warning";

type Audit = {
  id: string;
  sectorId: string;
  packRunId: string | null;
  status: ShieldStatus;
  regulated: boolean;
  disclaimerOk: boolean;
  claimsOk: boolean;
  claimsViolations: string[];
  auditedAt: string;
};

type Summary = { total: number; blocked: number; passed: number; warning: number; regulatedAudits: number; topViolations: Array<{ violation: string; count: number }> };

const STATUS_TONE: Record<ShieldStatus, "success" | "destructive" | "warning" | "neutral"> = {
  passed: "success",
  blocked: "destructive",
  warning: "warning",
  pending: "neutral",
};

export default function OsShieldPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectorId, setSectorId] = useState("dental");
  const [text, setText] = useState("");
  const [scanResult, setScanResult] = useState<Audit | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/os/shield");
      if (!res.ok) { setError(`Error ${res.status} al cargar shield`); return; }
      const d = (await res.json()) as { summary: Summary; audits: Audit[] };
      setSummary(d.summary);
      setAudits(d.audits ?? []);
    } catch {
      setError("Error de red al cargar shield");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function evaluate() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/os/shield/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorId, text }),
      });
      if (res.ok) {
        const d = (await res.json()) as { result: Audit };
        setScanResult(d.result);
        void load();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Regulated Sector Shield</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Disclaimer EU + claims check para sectores regulados. Bloquea publicación en portal si falla.{" "}
            <Link href="/os/sectors" className="text-primary hover:underline">Sectores</Link>
            {" · "}<Link href="/os/qa" className="text-primary hover:underline">QA</Link>
            {" · "}<Link href="/saas/compliance" className="text-primary hover:underline">Compliance</Link>
          </p>
        </div>

        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Bloqueados</p><p className="text-2xl font-bold mt-1 text-red-500">{summary.blocked}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Aprobados</p><p className="text-2xl font-bold mt-1 text-green-500">{summary.passed}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Audits regulados</p><p className="text-2xl font-bold mt-1">{summary.regulatedAudits}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Top violación</p><p className="text-xs font-bold mt-1 truncate">{summary.topViolations[0]?.violation ?? "—"}</p></div>
          </div>
        )}

        {/* Test scanner */}
        <div className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Sector</label>
            <input value={sectorId} onChange={(e) => setSectorId(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm w-36" />
            <Button disabled={busy} onClick={() => void evaluate()}>{busy ? "Escaneando…" : "Probar texto"}</Button>
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Pega el copy a verificar…" rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          {scanResult && (
            <div className="text-sm">
              <Badge tone={STATUS_TONE[scanResult.status]}>{scanResult.status}</Badge>
              <span className="ml-2 text-muted-foreground">
                disclaimer {scanResult.disclaimerOk ? "✅" : "❌"} · claims {scanResult.claimsOk ? "✅" : "❌"}
                {scanResult.claimsViolations.length > 0 && ` · ${scanResult.claimsViolations.join(", ")}`}
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm py-12 text-center">Cargando…</p>
        ) : audits.length === 0 ? (
          <div className="rounded-xl border border-border p-10 text-center">
            <p className="text-muted-foreground text-sm">Sin auditorías shield aún. Se generan al ejecutar packs de sectores regulados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-border text-muted-foreground text-xs uppercase">
                <th className="px-4 py-3 text-left">Sector</th><th className="px-4 py-3 text-left">Run</th>
                <th className="px-4 py-3 text-left">Estado</th><th className="px-4 py-3 text-center">Disclaimer</th>
                <th className="px-4 py-3 text-center">Claims</th><th className="px-4 py-3 text-right">Violaciones</th>
                <th className="px-4 py-3 text-left">Fecha</th>
              </tr></thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id} className="border-b border-border/50">
                    <td className="px-4 py-3 text-xs">{a.sectorId}{a.regulated && <Badge tone="warning">reg</Badge>}</td>
                    <td className="px-4 py-3 text-xs font-mono">{a.packRunId ? a.packRunId.slice(0, 8) + "…" : "—"}</td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge></td>
                    <td className="px-4 py-3 text-center">{a.disclaimerOk ? "✅" : "❌"}</td>
                    <td className="px-4 py-3 text-center">{a.claimsOk ? "✅" : "❌"}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{a.claimsViolations.length}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(a.auditedAt).toLocaleDateString()}</td>
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
