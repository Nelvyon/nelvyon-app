"use client";

import { useEffect, useState } from "react";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";

type GateStatus = "pending" | "passed" | "failed" | "blocked";

type QaRun = {
  id: string;
  packRunId: string | null;
  deliverableRef: string | null;
  visualScore: number;
  lighthouseScore: number;
  legalPassed: boolean;
  diffPercent: number | null;
  gateStatus: GateStatus;
  failureReasons: string[];
  createdAt: string;
};

type Summary = { total: number; passed: number; failed: number; blocked: number; passRate: number; avgVisual: number; avgLighthouse: number };

const STATUS_TONE: Record<GateStatus, "success" | "destructive" | "warning" | "neutral"> = {
  passed: "success",
  failed: "destructive",
  blocked: "destructive",
  pending: "neutral",
};

export default function OsQaPage() {
  const [runs, setRuns] = useState<QaRun[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/os/qa");
        if (res.ok) {
          const d = (await res.json()) as { summary: Summary; recentRuns: QaRun[] };
          setSummary(d.summary);
          setRuns(d.recentRuns ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">QA Gate 10/10</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gate pre-publish: visual ≥ 85 · Lighthouse proxy ≥ 90 · diff ≤ 5% · legal EU.
            <span className="ml-1 italic">Lighthouse es un proxy estructural en v1 (PSI real opcional).</span>
          </p>
        </div>

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Pass rate (30d)</p><p className="text-2xl font-bold mt-1">{summary.passRate}%</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Visual medio</p><p className="text-2xl font-bold mt-1">{summary.avgVisual}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Lighthouse proxy</p><p className="text-2xl font-bold mt-1">{summary.avgLighthouse}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Bloqueados</p><p className="text-2xl font-bold mt-1 text-red-500">{summary.blocked}</p></div>
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground text-sm py-12 text-center">Cargando QA runs…</p>
        ) : runs.length === 0 ? (
          <div className="rounded-xl border border-border p-10 text-center space-y-2">
            <p className="font-semibold">Sin QA runs todavía</p>
            <p className="text-muted-foreground text-sm">El gate se ejecuta automáticamente en cada pack run. Lanza un pack para ver auditorías aquí.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Ref</th>
                  <th className="px-4 py-3 text-right">Visual</th>
                  <th className="px-4 py-3 text-right">Lighthouse</th>
                  <th className="px-4 py-3 text-center">Legal</th>
                  <th className="px-4 py-3 text-right">Diff</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Motivos</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs">{r.deliverableRef ?? "—"}</td>
                    <td className="px-4 py-3 text-right"><span className={r.visualScore >= 85 ? "text-green-500" : "text-yellow-500"}>{r.visualScore}</span></td>
                    <td className="px-4 py-3 text-right"><span className={r.lighthouseScore >= 90 ? "text-green-500" : "text-yellow-500"}>{r.lighthouseScore}</span></td>
                    <td className="px-4 py-3 text-center">{r.legalPassed ? "✅" : "❌"}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{r.diffPercent !== null ? `${r.diffPercent}%` : "—"}</td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[r.gateStatus]}>{r.gateStatus}</Badge></td>
                    <td className="px-4 py-3 text-xs text-red-500 max-w-[220px]">{r.failureReasons.join("; ") || "—"}</td>
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
