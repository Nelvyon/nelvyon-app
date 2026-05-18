"use client";

import { useCallback, useMemo, useState } from "react";

type ApolloLibraryAgentId =
  | "apollo-auth"
  | "apollo-prospect"
  | "apollo-enrich"
  | "apollo-sequence"
  | "apollo-email"
  | "apollo-intent"
  | "apollo-analytics"
  | "apollo-sync";

type Row = { id: ApolloLibraryAgentId; title: string; subtitle: string };

type ApolloOutput = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

const AGENTS: Row[] = [
  { id: "apollo-auth", title: "API Key", subtitle: "Apollo.io auth" },
  { id: "apollo-prospect", title: "Prospectos", subtitle: "Sector · cargo · país" },
  { id: "apollo-enrich", title: "Enriquecer", subtitle: "Email · LinkedIn · tel" },
  { id: "apollo-sequence", title: "Secuencias", subtitle: "D1 · D3 · D5 · D8 · D12" },
  { id: "apollo-email", title: "Emails", subtitle: "Outreach personalizado" },
  { id: "apollo-intent", title: "Intent", subtitle: "Score 0–100" },
  { id: "apollo-analytics", title: "Analytics", subtitle: "Reply · meetings · pipeline" },
  { id: "apollo-sync", title: "Sync", subtitle: "NELVYON ↔ Apollo" },
];

export default function ApolloDashboard() {
  const [sector, setSector] = useState("b2b_saas");
  const [brand, setBrand] = useState("Workspace Apollo");
  const [verticalBrief, setVerticalBrief] = useState("VP Sales · mid-market");
  const [metricsBrief, setMetricsBrief] = useState("Reply >8% · meetings >2%");
  const [busyId, setBusyId] = useState<ApolloLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<ApolloLibraryAgentId, ApolloOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      sector,
      brand,
      verticalBrief: verticalBrief.trim() || undefined,
      metricsBrief: metricsBrief.trim() || undefined,
      metadata: { program: "apollo_v1" },
    }),
    [brand, metricsBrief, sector, verticalBrief],
  );

  const runAgent = useCallback(
    async (agentId: ApolloLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/apollo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input: payloadBase }),
        });
        const data = (await res.json()) as { result?: ApolloOutput; error?: string };
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
          Apollo.io <span style={{ color: "#f4b400" }}>×</span> NELVYON
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
          Marca / workspace
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          ICP / vertical
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={verticalBrief}
            onChange={(e) => setVerticalBrief(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Contexto / métricas
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
              style={{ borderColor: "#f4b40033" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="line-clamp-2 text-sm md:text-base font-semibold text-zinc-100">{a.title}</h3>
                  <p className="text-xs text-zinc-400">{a.subtitle}</p>
                </div>
                {score != null ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-bold text-zinc-950"
                    style={{ backgroundColor: "#f4b400" }}
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
                style={{ backgroundColor: "#f4b400" }}
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
                      className="rounded-full border border-[#f4b40066] px-2 py-0.5 text-[10px] text-[#ffd666]"
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
