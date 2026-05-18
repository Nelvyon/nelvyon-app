"use client";

import { useCallback, useMemo, useState } from "react";

type ComparatorLibraryAgentId =
  | "comparator-metrics-narrator"
  | "comparator-roi-calculator"
  | "comparator-visual-story"
  | "comparator-benchmark"
  | "comparator-social-share"
  | "comparator-pdf-summary"
  | "comparator-upsell-trigger"
  | "comparator-testimonial-miner";

type Row = { id: ComparatorLibraryAgentId; title: string; subtitle: string };

type ComparatorOutput = {
  agentId: string;
  content: string;
  score: number;
  improvements: string[];
  visualData: string[];
};

const accent = "#14b8a6";

const AGENTS: Row[] = [
  { id: "comparator-metrics-narrator", title: "Métricas", subtitle: "Narrativa ejecutiva" },
  { id: "comparator-roi-calculator", title: "ROI", subtitle: "Retorno del período" },
  { id: "comparator-visual-story", title: "Historia visual", subtitle: "Transformación" },
  { id: "comparator-benchmark", title: "Benchmark", subtitle: "vs sector" },
  { id: "comparator-social-share", title: "RRSS", subtitle: "Contenido shareable" },
  { id: "comparator-pdf-summary", title: "PDF", subtitle: "Resumen ejecutivo" },
  { id: "comparator-upsell-trigger", title: "Upsell", subtitle: "Upgrade propuesto" },
  { id: "comparator-testimonial-miner", title: "Testimonios", subtitle: "Citas de impacto" },
];

export default function ComparatorDashboard() {
  const [sector, setSector] = useState("saas");
  const [clientName, setClientName] = useState("Cliente demo");
  const [period, setPeriod] = useState("Q1 2026");
  const [beforeJson, setBeforeJson] = useState('{"CAC":"120€","NRR":"108%"}');
  const [afterJson, setAfterJson] = useState('{"CAC":"84€","NRR":"114%"}');
  const [busyId, setBusyId] = useState<ComparatorLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<ComparatorLibraryAgentId, ComparatorOutput>>>({});

  const payloadBase = useMemo(() => {
    let beforeMetrics: Record<string, string> = {};
    let afterMetrics: Record<string, string> = {};
    try {
      beforeMetrics = JSON.parse(beforeJson) as Record<string, string>;
      afterMetrics = JSON.parse(afterJson) as Record<string, string>;
    } catch {
      /* invalid JSON handled on submit */
    }
    return {
      sector,
      clientName,
      period,
      beforeMetrics,
      afterMetrics,
    };
  }, [afterJson, beforeJson, clientName, period, sector]);

  const runAgent = useCallback(
    async (agentId: ComparatorLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        JSON.parse(beforeJson);
        JSON.parse(afterJson);
        const res = await fetch("/api/os/agents/comparator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            input: {
              sector: payloadBase.sector.trim(),
              clientName: payloadBase.clientName.trim(),
              period: payloadBase.period.trim(),
              beforeMetrics: payloadBase.beforeMetrics,
              afterMetrics: payloadBase.afterMetrics,
            },
          }),
        });
        const data = (await res.json()) as { result?: ComparatorOutput; error?: string };
        if (!res.ok) throw new Error(data.error ?? "request_failed");
        if (!data.result) throw new Error("sin resultado");
        setOutputs((prev) => ({ ...prev, [agentId]: data.result! }));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Error";
        setStatus(msg);
      } finally {
        setBusyId(null);
      }
    },
    [afterJson, beforeJson, payloadBase],
  );

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold" style={{ color: accent }}>
          Comparador antes / después
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
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Métricas ANTES (JSON objeto clave→valor)
          <textarea
            className="min-h-[72px] rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-xs text-zinc-100"
            value={beforeJson}
            onChange={(e) => setBeforeJson(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Métricas DESPUÉS (JSON objeto clave→valor)
          <textarea
            className="min-h-[72px] rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-xs text-zinc-100"
            value={afterJson}
            onChange={(e) => setAfterJson(e.target.value)}
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
              {out?.improvements?.length ? (
                <ul className="mt-1 max-h-36 space-y-1.5 overflow-y-auto text-xs">
                  {out.improvements.slice(0, 8).map((line, idx) => (
                    <li key={idx} className="flex gap-2 rounded border border-zinc-800 bg-zinc-950/50 p-2 text-zinc-300">
                      <span className="shrink-0 text-emerald-400" aria-hidden>
                        ▲
                      </span>
                      <span>{line.length > 220 ? `${line.slice(0, 220)}…` : line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Mejoras tras generar.</p>
              )}
              {out?.visualData?.length ? (
                <div className="flex flex-wrap gap-1">
                  {out.visualData.slice(0, 10).map((f, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border px-2 py-0.5 text-[10px] text-zinc-200"
                      style={{ borderColor: `${accent}66`, color: accent }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Datos clave tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
