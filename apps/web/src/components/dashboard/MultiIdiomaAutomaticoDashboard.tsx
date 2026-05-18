"use client";

import { useCallback, useMemo, useState } from "react";

type MultiIdiomaAutomaticoLibraryAgentId =
  | "multiidiomaautomatico-traductor"
  | "multiidiomaautomatico-localizador"
  | "multiidiomaautomatico-seo"
  | "multiidiomaautomatico-detector"
  | "multiidiomaautomatico-calidad"
  | "multiidiomaautomatico-email"
  | "multiidiomaautomatico-legal"
  | "multiidiomaautomatico-analytics";

type Row = { id: MultiIdiomaAutomaticoLibraryAgentId; title: string; subtitle: string };

type MultiIdiomaAutomaticoOutput = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

const accent = "#a78bfa";

const AGENTS: Row[] = [
  { id: "multiidiomaautomatico-traductor", title: "Traductor", subtitle: "40+ idiomas" },
  { id: "multiidiomaautomatico-localizador", title: "Localiza", subtitle: "Cultural" },
  { id: "multiidiomaautomatico-seo", title: "SEO", subtitle: "Hreflang" },
  { id: "multiidiomaautomatico-detector", title: "Detector", subtitle: "<50ms" },
  { id: "multiidiomaautomatico-calidad", title: "Calidad", subtitle: ">95/100" },
  { id: "multiidiomaautomatico-email", title: "Email", subtitle: "Nativo" },
  { id: "multiidiomaautomatico-legal", title: "Legal", subtitle: "GDPR · CCPA" },
  { id: "multiidiomaautomatico-analytics", title: "Analytics", subtitle: "Por mercado" },
];

export default function MultiIdiomaAutomaticoDashboard() {
  const [sector, setSector] = useState("global");
  const [brand, setBrand] = useState("Global demo");
  const [localeBrief, setLocaleBrief] = useState("40+ idiomas · hreflang · localización cultural");
  const [metricsBrief, setMetricsBrief] = useState("Calidad traducción · conversión por mercado");
  const [busyId, setBusyId] = useState<MultiIdiomaAutomaticoLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<MultiIdiomaAutomaticoLibraryAgentId, MultiIdiomaAutomaticoOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      sector,
      brand,
      localeBrief: localeBrief.trim() || undefined,
      metricsBrief: metricsBrief.trim() || undefined,
      metadata: { program: "multiidiomaautomatico_v1" },
    }),
    [brand, localeBrief, metricsBrief, sector],
  );

  const runAgent = useCallback(
    async (agentId: MultiIdiomaAutomaticoLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/multiidiomaautomatico", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input: payloadBase }),
        });
        const data = (await res.json()) as { result?: MultiIdiomaAutomaticoOutput; error?: string };
        if (!res.ok) throw new Error(data.error ?? "request_failed");
        if (!data.result) throw new Error("sin resultado");
        setOutputs((prev) => ({ ...prev, [agentId]: data.result! }));
      } catch (e: unknown) {
        setStatus(e instanceof Error ? e.message : "Error");
      } finally {
        setBusyId(null);
      }
    },
    [payloadBase],
  );

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-100">
          Multi-idioma automático <span style={{ color: accent }}>×</span> NELVYON
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
          Marca / negocio
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Idiomas / contexto
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={localeBrief}
            onChange={(e) => setLocaleBrief(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Métricas / calidad
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={metricsBrief}
            onChange={(e) => setMetricsBrief(e.target.value)}
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
              {out?.highlights?.length ? (
                <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto text-xs text-zinc-300">
                  {out.highlights.slice(0, 6).map((h, idx) => (
                    <li key={idx} className="rounded border border-zinc-800 bg-zinc-950/50 p-1.5">
                      {h.length > 160 ? `${h.slice(0, 160)}…` : h}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Highlights tras generar.</p>
              )}
              {out?.metrics?.length ? (
                <div className="flex flex-wrap gap-1">
                  {out.metrics.slice(0, 8).map((m, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border px-2 py-0.5 text-[10px]"
                      style={{ borderColor: `${accent}66`, color: "#ddd6fe" }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Métricas tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
