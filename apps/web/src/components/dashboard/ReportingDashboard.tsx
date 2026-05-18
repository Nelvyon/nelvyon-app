"use client";

import { useCallback, useMemo, useState } from "react";

type ReportingAgentId =
  | "reporting-executive-summary"
  | "reporting-kpi-narrative"
  | "reporting-insight-extractor"
  | "reporting-recommendation"
  | "reporting-competitive-context"
  | "reporting-visual-descriptor"
  | "reporting-client-story"
  | "reporting-next-steps";

type Row = { id: ReportingAgentId; title: string; subtitle: string };

type ReportingOutput = {
  agentId: string;
  content: string;
  score: number;
  sections: string[];
  highlights: string[];
};

const accent = "#14b8a6";

const AGENTS: Row[] = [
  { id: "reporting-executive-summary", title: "Executive summary", subtitle: "Resumen período" },
  { id: "reporting-kpi-narrative", title: "KPI narrative", subtitle: "Contexto métricas" },
  { id: "reporting-insight-extractor", title: "Insights", subtitle: "Accionables" },
  { id: "reporting-recommendation", title: "Recomendaciones", subtitle: "Próximo período" },
  { id: "reporting-competitive-context", title: "Competencia", subtitle: "Contexto mercado" },
  { id: "reporting-visual-descriptor", title: "Visual PDF", subtitle: "Gráficos" },
  { id: "reporting-client-story", title: "Historia cliente", subtitle: "Narrativa éxito" },
  { id: "reporting-next-steps", title: "Next steps", subtitle: "Plan acción" },
];

export default function ReportingDashboard() {
  const [sector, setSector] = useState("saas");
  const [clientName, setClientName] = useState("Cliente demo");
  const [period, setPeriod] = useState("Q1 2026");
  const [brandColor, setBrandColor] = useState("#14b8a6");
  const [busyId, setBusyId] = useState<ReportingAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<ReportingAgentId, ReportingOutput>>>({});

  const metrics = useMemo(
    () => ({
      revenue: "125000",
      mrr_growth: "4.2%",
      churn_rate: "1.8%",
      nps: "42",
    }),
    [],
  );

  const runAgent = useCallback(
    async (agentId: ReportingAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/reporting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            input: {
              sector: sector.trim(),
              clientName: clientName.trim(),
              period: period.trim(),
              metrics,
              brandColor: brandColor.trim(),
            },
          }),
        });
        const data = (await res.json()) as { result?: ReportingOutput; error?: string };
        if (!res.ok) throw new Error(data.error ?? "request_failed");
        if (!data.result) throw new Error("sin resultado");
        setOutputs((prev) => ({ ...prev, [agentId]: data.result! }));
      } catch {
        setStatus(`Error al ejecutar ${agentId}`);
      } finally {
        setBusyId(null);
      }
    },
    [brandColor, clientName, metrics, period, sector],
  );

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold" style={{ color: accent }}>
          Reporting PDF branded
        </h2>
        {status ? <p className="text-sm text-rose-400">{status}</p> : null}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          Sector
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Cliente
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Período
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Color marca
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {AGENTS.map((a) => {
          const out = outputs[a.id];
          const score = out?.score ?? null;
          return (
            <article
              key={a.id}
              className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 md:p-6"
              style={{ borderColor: `${accent}33` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="line-clamp-2 text-sm md:text-base font-semibold text-zinc-100">{a.title}</h3>
                  <p className="text-xs text-zinc-400">{a.subtitle}</p>
                </div>
                {score != null ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-bold text-zinc-950"
                    style={{ backgroundColor: accent }}
                    title="Score"
                  >
                    {score}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500">—</span>
                )}
              </div>
              <button
                type="button"
                disabled={busyId !== null}
                className="min-h-[44px] rounded px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50 md:text-base"
                style={{ backgroundColor: accent }}
                onClick={() => void runAgent(a.id)}
              >
                {busyId === a.id ? "Ejecutando…" : "Generar bloque"}
              </button>
              {out?.sections?.length ? (
                <div className="flex flex-wrap gap-1">
                  {out.sections.slice(0, 8).map((s, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border px-2 py-0.5 text-[10px] text-zinc-200"
                      style={{ borderColor: `${accent}66`, color: accent }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Secciones sugeridas tras generar.</p>
              )}
              {out?.highlights?.length ? (
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-zinc-300">
                  {out.highlights.slice(0, 6).map((h, idx) => (
                    <li key={idx}>{h}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Highlights tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
