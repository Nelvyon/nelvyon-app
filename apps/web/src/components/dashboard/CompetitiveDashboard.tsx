"use client";

import { useCallback, useMemo, useState } from "react";

type CompetitiveAgentId =
  | "competitive-positioning-analyst"
  | "competitive-content-gap"
  | "competitive-pricing-intel"
  | "competitive-backlink-profile"
  | "competitive-ads-spy"
  | "competitive-social-presence"
  | "competitive-review-miner"
  | "competitive-win-loss";

type CompetitiveRow = {
  id: CompetitiveAgentId;
  title: string;
  subtitle: string;
};

type CompetitiveOutput = {
  agentId: string;
  content: string;
  score: number;
  insights: string[];
};

const accent = "#14b8a6";

const AGENTS: CompetitiveRow[] = [
  { id: "competitive-positioning-analyst", title: "Posicionamiento", subtitle: "Marca vs competidor" },
  { id: "competitive-content-gap", title: "Content gap", subtitle: "Temas y formatos" },
  { id: "competitive-pricing-intel", title: "Pricing intel", subtitle: "Estructura inferida" },
  { id: "competitive-backlink-profile", title: "Backlinks", subtitle: "Perfil off-page" },
  { id: "competitive-ads-spy", title: "Ads spy", subtitle: "Mensajes paid" },
  { id: "competitive-social-presence", title: "Social", subtitle: "Presencia RRSS" },
  { id: "competitive-review-miner", title: "Reviews", subtitle: "VoC competidor" },
  { id: "competitive-win-loss", title: "Win/Loss", subtitle: "Plan para ganar" },
];

export default function CompetitiveDashboard() {
  const [sector, setSector] = useState("saas");
  const [competitorUrl, setCompetitorUrl] = useState("https://competidor.ejemplo.com");
  const [ownBrand, setOwnBrand] = useState("Mi marca");
  const [busyId, setBusyId] = useState<CompetitiveAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<CompetitiveAgentId, CompetitiveOutput>>>({});

  const metricsPreview = useMemo(() => ({ cac: "120", churn: "2.1%" }), []);

  const runAgent = useCallback(
    async (agentId: CompetitiveAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/competitive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            input: {
              sector: sector.trim(),
              competitorUrl: competitorUrl.trim(),
              ownBrand: ownBrand.trim(),
              ownMetrics: metricsPreview,
            },
          }),
        });
        const data = (await res.json()) as { result?: CompetitiveOutput; error?: string };
        if (!res.ok) throw new Error(data.error ?? "request_failed");
        if (!data.result) throw new Error("sin resultado");
        setOutputs((prev) => ({ ...prev, [agentId]: data.result! }));
      } catch {
        setStatus(`Error al ejecutar ${agentId}`);
      } finally {
        setBusyId(null);
      }
    },
    [competitorUrl, metricsPreview, ownBrand, sector],
  );

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold" style={{ color: accent }}>
          Análisis competitivo RT
        </h2>
        {status ? <p className="text-sm text-rose-400">{status}</p> : null}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Sector
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          URL competidor
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={competitorUrl}
            onChange={(e) => setCompetitorUrl(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Marca propia
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={ownBrand}
            onChange={(e) => setOwnBrand(e.target.value)}
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
                    title="Score modelo"
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
                {busyId === a.id ? "Ejecutando…" : "Analizar"}
              </button>
              {out?.insights?.length ? (
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-zinc-300">
                  {out.insights.slice(0, 6).map((insight, idx) => (
                    <li key={idx}>{insight}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Insights aparecen tras ejecutar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
