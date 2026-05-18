"use client";

import { useCallback, useMemo, useState } from "react";

type WidgetLibraryAgentId =
  | "widget-results-display"
  | "widget-social-proof-badge"
  | "widget-live-counter"
  | "widget-testimonial-carousel"
  | "widget-roi-calculator"
  | "widget-leaderboard-embed"
  | "widget-customization"
  | "widget-analytics-tracker";

type Row = { id: WidgetLibraryAgentId; title: string; subtitle: string };

type WidgetOutput = {
  agentId: string;
  content: string;
  score: number;
  embedCode: string;
  previewData: string[];
};

const accent = "#14b8a6";

const AGENTS: Row[] = [
  { id: "widget-results-display", title: "Resultados", subtitle: "KPI" },
  { id: "widget-social-proof-badge", title: "Badge", subtitle: "Social proof" },
  { id: "widget-live-counter", title: "Contador", subtitle: "Tiempo real" },
  { id: "widget-testimonial-carousel", title: "Carrusel", subtitle: "Testimonios" },
  { id: "widget-roi-calculator", title: "ROI", subtitle: "Calculadora" },
  { id: "widget-leaderboard-embed", title: "Ranking", subtitle: "Leaderboard" },
  { id: "widget-customization", title: "Estilos", subtitle: "Marca" },
  { id: "widget-analytics-tracker", title: "Analytics", subtitle: "Tracking" },
];

export default function WidgetDashboard() {
  const [sector, setSector] = useState("saas");
  const [brand, setBrand] = useState("Marca demo");
  const [metricKey, setMetricKey] = useState("leads_mes");
  const [metricValue, setMetricValue] = useState("+32%");
  const [widgetType, setWidgetType] = useState("inline");
  const [embedTarget, setEmbedTarget] = useState("WordPress footer");
  const [busyId, setBusyId] = useState<WidgetLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [copyOk, setCopyOk] = useState<WidgetLibraryAgentId | null>(null);
  const [outputs, setOutputs] = useState<Partial<Record<WidgetLibraryAgentId, WidgetOutput>>>({});

  const metrics = useMemo(() => {
    const k = metricKey.trim();
    const v = metricValue.trim();
    if (!k) return {} as Record<string, string>;
    return { [k]: v };
  }, [metricKey, metricValue]);

  const payloadBase = useMemo(
    () => ({
      sector,
      brand,
      metrics,
      widgetType,
      embedTarget,
    }),
    [brand, embedTarget, metrics, sector, widgetType],
  );

  const copyEmbed = useCallback(async (agentId: WidgetLibraryAgentId, code: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyOk(agentId);
      setTimeout(() => setCopyOk(null), 2000);
    } catch {
      setStatus("No se pudo copiar al portapapeles");
    }
  }, []);

  const runAgent = useCallback(
    async (agentId: WidgetLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/widget", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            input: {
              sector: payloadBase.sector.trim(),
              brand: payloadBase.brand.trim(),
              metrics: payloadBase.metrics,
              widgetType: payloadBase.widgetType.trim(),
              embedTarget: payloadBase.embedTarget.trim(),
            },
          }),
        });
        const data = (await res.json()) as { result?: WidgetOutput; error?: string };
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
          Widget de resultados embebible
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
          Marca
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tipo widget
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={widgetType}
            onChange={(e) => setWidgetType(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Destino embed
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={embedTarget}
            onChange={(e) => setEmbedTarget(e.target.value)}
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
              {out?.embedCode ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-zinc-500">embedCode</span>
                    <button
                      type="button"
                      className="rounded border px-2 py-0.5 text-[10px] text-zinc-200"
                      style={{ borderColor: `${accent}66`, color: accent }}
                      onClick={() => void copyEmbed(a.id, out.embedCode)}
                    >
                      {copyOk === a.id ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded border border-zinc-800 bg-zinc-950 p-2 font-mono text-[10px] text-emerald-200/90">
                    {out.embedCode}
                  </pre>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Código embed tras generar.</p>
              )}
              {out?.previewData?.length ? (
                <div className="flex flex-wrap gap-1">
                  {out.previewData.slice(0, 10).map((p, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border px-2 py-0.5 text-[10px] text-zinc-200"
                      style={{ borderColor: `${accent}66`, color: accent }}
                    >
                      {p.length > 80 ? `${p.slice(0, 80)}…` : p}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Preview tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
