"use client";

import { useCallback, useMemo, useState } from "react";

type ScalingLibraryAgentId =
  | "scaling-usage-analyzer"
  | "scaling-upgrade-proposer"
  | "scaling-pricing-anchor"
  | "scaling-friction-reducer"
  | "scaling-timing-optimizer"
  | "scaling-downgrade-risk"
  | "scaling-annual-conversion"
  | "scaling-expansion-revenue";

type Row = { id: ScalingLibraryAgentId; title: string; subtitle: string };

type ScalingOutput = {
  agentId: string;
  content: string;
  score: number;
  recommendation: string;
  triggers: string[];
};

const accent = "#14b8a6";

const AGENTS: Row[] = [
  { id: "scaling-usage-analyzer", title: "Uso", subtitle: "Señales upgrade" },
  { id: "scaling-upgrade-proposer", title: "Upgrade", subtitle: "Propuesta ROI" },
  { id: "scaling-pricing-anchor", title: "Precio", subtitle: "Anclaje valor" },
  { id: "scaling-friction-reducer", title: "Fricción", subtitle: "Checkout" },
  { id: "scaling-timing-optimizer", title: "Timing", subtitle: "Momento óptimo" },
  { id: "scaling-downgrade-risk", title: "Downgrade", subtitle: "Prevención" },
  { id: "scaling-annual-conversion", title: "Anual", subtitle: "Mensual → anual" },
  { id: "scaling-expansion-revenue", title: "Expansión", subtitle: "NRR cuenta" },
];

export default function ScalingDashboard() {
  const [sector, setSector] = useState("saas");
  const [currentPlan, setCurrentPlan] = useState("pro");
  const [metricKey, setMetricKey] = useState("api_calls_pct");
  const [metricValue, setMetricValue] = useState("88");
  const [monthsActive, setMonthsActive] = useState("8");
  const [mrr, setMrr] = useState("1200 EUR");
  const [busyId, setBusyId] = useState<ScalingLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<ScalingLibraryAgentId, ScalingOutput>>>({});

  const usageMetrics = useMemo(() => {
    const k = metricKey.trim();
    const v = metricValue.trim();
    if (!k) return {} as Record<string, string>;
    return { [k]: v };
  }, [metricKey, metricValue]);

  const payloadBase = useMemo(
    () => ({
      sector,
      currentPlan,
      usageMetrics,
      monthsActive: monthsActive.trim() ? Number(monthsActive.trim()) : undefined,
      mrr: mrr.trim(),
    }),
    [currentPlan, mrr, monthsActive, sector, usageMetrics],
  );

  const runAgent = useCallback(
    async (agentId: ScalingLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const input: Record<string, unknown> = {
          sector: payloadBase.sector.trim(),
          currentPlan: payloadBase.currentPlan.trim(),
          usageMetrics: payloadBase.usageMetrics,
        };
        if (payloadBase.monthsActive != null && Number.isFinite(payloadBase.monthsActive)) {
          input.monthsActive = payloadBase.monthsActive;
        }
        if (payloadBase.mrr) input.mrr = payloadBase.mrr;

        const res = await fetch("/api/os/agents/scaling", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input }),
        });
        const data = (await res.json()) as { result?: ScalingOutput; error?: string };
        if (!res.ok) throw new Error(data.error ?? "request_failed");
        if (!data.result) throw new Error("sin resultado");
        setOutputs((prev) => ({ ...prev, [agentId]: data.result! }));
      } catch {
        setStatus(`Error al ejecutar ${agentId}`);
      } finally {
        setBusyId(null);
      }
    },
    [payloadBase],
  );

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold" style={{ color: accent }}>
          Auto-escalado de plan
        </h2>
        {status ? <p className="text-sm text-rose-400">{status}</p> : null}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Sector
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Plan actual
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={currentPlan}
            onChange={(e) => setCurrentPlan(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Meses activo
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={monthsActive}
            onChange={(e) => setMonthsActive(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          MRR
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={mrr}
            onChange={(e) => setMrr(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Métrica (clave)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={metricKey}
            onChange={(e) => setMetricKey(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Métrica (valor)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={metricValue}
            onChange={(e) => setMetricValue(e.target.value)}
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
                {busyId === a.id ? "Ejecutando…" : "Generar"}
              </button>
              {out?.recommendation ? (
                <p
                  className="rounded border p-2 text-xs font-medium leading-snug text-zinc-100"
                  style={{ borderColor: `${accent}55`, backgroundColor: `${accent}14` }}
                >
                  {out.recommendation.length > 400 ? `${out.recommendation.slice(0, 400)}…` : out.recommendation}
                </p>
              ) : (
                <p className="text-xs text-zinc-500">Recomendación tras generar.</p>
              )}
              {out?.triggers?.length ? (
                <div className="flex flex-wrap gap-1">
                  {out.triggers.slice(0, 10).map((t, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border px-2 py-0.5 text-[10px] text-zinc-200"
                      style={{ borderColor: `${accent}66`, color: accent }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Triggers tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
