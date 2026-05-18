"use client";

import { useEffect, useState } from "react";

type SummaryRow = {
  agentId: string;
  avgScore: number;
  avgAttempts: number;
  passRate: number;
};

const accent = "#10b981";

function badge(score: number): string {
  if (score >= 99) return "🟢";
  if (score >= 90) return "🟡";
  return "🔴";
}

export default function QualityDashboard() {
  const [globalAverage, setGlobalAverage] = useState(0);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function load(): Promise<void> {
    setLoading(true);
    try {
      const res = await fetch("/api/os/quality/scores");
      if (!res.ok) throw new Error("load_failed");
      const data = (await res.json()) as { globalAverage: number; summary: SummaryRow[] };
      setGlobalAverage(data.globalAverage ?? 0);
      setSummary(data.summary ?? []);
    } catch {
      setStatus("No se pudieron cargar los scores");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <h2 className="text-lg font-semibold" style={{ color: accent }}>
        Evaluador Automático de Calidad
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        Score medio global: <span className="font-semibold text-emerald-400">{globalAverage.toFixed(2)}</span>
      </p>

      {loading ? <p className="mt-3 text-sm text-zinc-400">Cargando…</p> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="text-xs uppercase text-zinc-400">
            <tr>
              <th className="px-2 py-1">Agente</th>
              <th className="px-2 py-1">Score medio</th>
              <th className="px-2 py-1">Intentos medio</th>
              <th className="px-2 py-1">% passed</th>
              <th className="px-2 py-1">Estado</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => (
              <tr key={row.agentId} className="border-t border-zinc-800">
                <td className="px-2 py-2">{row.agentId}</td>
                <td className="px-2 py-2">{row.avgScore.toFixed(2)}</td>
                <td className="px-2 py-2">{row.avgAttempts.toFixed(2)}</td>
                <td className="px-2 py-2">{row.passRate.toFixed(2)}%</td>
                <td className="px-2 py-2">{badge(row.avgScore)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && summary.length === 0 ? <p className="mt-3 text-sm text-zinc-500">Sin datos de calidad todavía.</p> : null}
      {status ? <p className="mt-3 text-sm text-zinc-300">{status}</p> : null}
    </section>
  );
}
