"use client";

import { useCallback, useMemo, useState } from "react";

import { AgentGrid, AgentGridItem } from "@/components/dashboard/AgentGrid";

type AdsAgentId =
  | "ads-estrategia"
  | "ads-google"
  | "ads-meta"
  | "ads-tiktok"
  | "ads-audiencias"
  | "ads-creatividades"
  | "ads-attribution"
  | "ads-optimizacion";

type Row = { id: AdsAgentId; title: string; subtitle: string };

type AdsOutput = {
  result: string;
  insights: string[];
  recommendedActions: string[];
};

const accent = "#f43f5e";

const AGENTS: Row[] = [
  { id: "ads-estrategia", title: "Estrategia Paid Media", subtitle: "Omnicanal · presupuesto" },
  { id: "ads-google", title: "Google Ads", subtitle: "Search · PMAX" },
  { id: "ads-meta", title: "Meta Ads", subtitle: "Facebook · Instagram" },
  { id: "ads-tiktok", title: "TikTok Ads", subtitle: "Hooks · Spark" },
  { id: "ads-audiencias", title: "Audiencias Lookalike", subtitle: "Custom + LAL" },
  { id: "ads-creatividades", title: "Creatividades & Rotación", subtitle: "Ad fatigue" },
  { id: "ads-attribution", title: "Attribution Multi-Touch", subtitle: "ROAS real" },
  { id: "ads-optimizacion", title: "Optimización ROAS", subtitle: "Pujas · QS · LP" },
];

export default function AdsDashboard() {
  const [businessContext, setBusinessContext] = useState(
    "D2C moda: CPA objetivo 35€ en ES+PT, mix actual 60% Meta / 40% Google; catálogo 800 SKUs y estacionalidad alta.",
  );
  const [busyId, setBusyId] = useState<AdsAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<AdsAgentId, AdsOutput>>>({});

  const payloadBase = useMemo(() => ({ businessContext }), [businessContext]);

  const runAgent = useCallback(
    async (agentId: AdsAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/ads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            agentId,
            input: { ...payloadBase, metadata: { program: "ads_v1" as const } },
          }),
        });
        const data = (await res.json()) as { result?: AdsOutput; error?: string };
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
          Paid media <span style={{ color: accent }}>×</span> NELVYON OS
        </h2>
        {status ? <p className="text-sm text-rose-400">{status}</p> : null}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:col-span-1">
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          Contexto de negocio
          <textarea
            className="min-h-[88px] rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={businessContext}
            onChange={(e) => setBusinessContext(e.target.value)}
          />
        </label>
        <p className="text-xs text-zinc-500 md:col-span-2">
          Programa: <span className="font-mono text-zinc-400">metadata.program = ads_v1</span> (incluido en{" "}
          <span className="font-mono text-zinc-400">input</span> al guardar).
        </p>
      </div>

      <AgentGrid>
        {AGENTS.map((a) => {
          const out = outputs[a.id];
          const nInsights = out?.insights?.length ?? 0;
          const hasResult = Boolean(
            out && (out.result?.trim() || (out.insights?.length ?? 0) > 0 || (out.recommendedActions?.length ?? 0) > 0),
          );
          return (
            <AgentGridItem key={a.id} hasResult={hasResult}>
            <article
              className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 md:p-6"
              style={{ borderColor: `${accent}33` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="line-clamp-2 text-sm md:text-base font-semibold text-zinc-100">{a.title}</h3>
                  <p className="text-xs text-zinc-400">{a.subtitle}</p>
                </div>
                {nInsights > 0 ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-bold text-zinc-50"
                    style={{ backgroundColor: accent }}
                    title="Insights"
                  >
                    {nInsights}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500">—</span>
                )}
              </div>
              <button
                type="button"
                disabled={busyId !== null}
                className="min-h-[44px] rounded px-3 py-2 text-sm font-semibold text-zinc-50 disabled:opacity-50 md:text-base"
                style={{ backgroundColor: accent }}
                onClick={() => void runAgent(a.id)}
              >
                {busyId === a.id ? "Ejecutando…" : "Ejecutar"}
              </button>
              {out?.result ? <p className="line-clamp-3 text-xs text-zinc-400">{out.result}</p> : null}
              {out?.insights?.length ? (
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-zinc-300">
                  {out.insights.slice(0, 4).map((ins, idx) => (
                    <li key={idx}>{ins}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Insights tras ejecutar.</p>
              )}
              {out?.recommendedActions?.length ? (
                <ul className="list-decimal space-y-1 pl-4 text-xs text-zinc-400">
                  {out.recommendedActions.slice(0, 4).map((act, idx) => (
                    <li key={idx}>{act}</li>
                  ))}
                </ul>
              ) : null}
            </article>
            </AgentGridItem>
          );
        })}
      </AgentGrid>
    </section>
  );
}
