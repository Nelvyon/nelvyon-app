"use client";

import { useCallback, useMemo, useState } from "react";

type SuperiorLeadEnrichmentLibraryAgentId =
  | "superiorleadenrichment-profile"
  | "superiorleadenrichment-company"
  | "superiorleadenrichment-intent"
  | "superiorleadenrichment-scoring"
  | "superiorleadenrichment-segment"
  | "superiorleadenrichment-verification"
  | "superiorleadenrichment-social"
  | "superiorleadenrichment-routing";

type Row = { id: SuperiorLeadEnrichmentLibraryAgentId; title: string; subtitle: string };

type SuperiorLeadEnrichmentOutput = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

const accent = "#38bdf8";

const AGENTS: Row[] = [
  { id: "superiorleadenrichment-profile", title: "Perfil", subtitle: "<3s" },
  { id: "superiorleadenrichment-company", title: "Empresa", subtitle: "Tech stack" },
  { id: "superiorleadenrichment-intent", title: "Intent", subtitle: "Señales" },
  { id: "superiorleadenrichment-scoring", title: "Scoring", subtitle: "ICP 0-100" },
  { id: "superiorleadenrichment-segment", title: "Segmento", subtitle: "ICP" },
  { id: "superiorleadenrichment-verification", title: "Verifica", subtitle: ">98%" },
  { id: "superiorleadenrichment-social", title: "Social", subtitle: "LinkedIn" },
  { id: "superiorleadenrichment-routing", title: "Routing", subtitle: "Auto rep" },
];

export default function SuperiorLeadEnrichmentDashboard() {
  const [sector, setSector] = useState("b2b");
  const [brand, setBrand] = useState("B2B demo");
  const [leadBrief, setLeadBrief] = useState("VP Sales · SaaS mid-market · LinkedIn");
  const [metricsBrief, setMetricsBrief] = useState("ICP fit · verification rate · routing");
  const [busyId, setBusyId] = useState<SuperiorLeadEnrichmentLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<SuperiorLeadEnrichmentLibraryAgentId, SuperiorLeadEnrichmentOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      sector,
      brand,
      leadBrief: leadBrief.trim() || undefined,
      metricsBrief: metricsBrief.trim() || undefined,
      metadata: { program: "superiorleadenrichment_v1" },
    }),
    [brand, leadBrief, metricsBrief, sector],
  );

  const runAgent = useCallback(
    async (agentId: SuperiorLeadEnrichmentLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/superiorleadenrichment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input: payloadBase }),
        });
        const data = (await res.json()) as { result?: SuperiorLeadEnrichmentOutput; error?: string };
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
          Superior lead enrichment <span style={{ color: accent }}>×</span> NELVYON
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
          Lead / contexto
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={leadBrief}
            onChange={(e) => setLeadBrief(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Métricas / enriquecimiento
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
                      style={{ borderColor: `${accent}66`, color: "#bae6fd" }}
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
