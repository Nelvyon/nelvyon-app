"use client";

import { useCallback, useMemo, useState } from "react";

type PinterestAdsLibraryAgentId =
  | "pinterestads-auth"
  | "pinterestads-campaign"
  | "pinterestads-pin"
  | "pinterestads-audience"
  | "pinterestads-bid"
  | "pinterestads-report"
  | "pinterestads-keyword"
  | "pinterestads-analytics";

type Row = { id: PinterestAdsLibraryAgentId; title: string; subtitle: string };

type PinterestAdsOutput = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

const accent = "#e60023";

const AGENTS: Row[] = [
  { id: "pinterestads-auth", title: "OAuth2", subtitle: "Pinterest Ads API" },
  { id: "pinterestads-campaign", title: "Campañas", subtitle: "ROAS ≥2.5x" },
  { id: "pinterestads-pin", title: "Pins", subtitle: "1000×1500 + CTA" },
  { id: "pinterestads-audience", title: "Audiencias", subtitle: "LTV>200€ seed" },
  { id: "pinterestads-bid", title: "Pujas", subtitle: "CPA <15€" },
  { id: "pinterestads-report", title: "Reportes", subtitle: "Impresiones·ROAS" },
  { id: "pinterestads-keyword", title: "Keywords", subtitle: "Tendencias" },
  { id: "pinterestads-analytics", title: "Analytics", subtitle: "CPM·CPC·CTR" },
];

export default function PinterestAdsDashboard() {
  const [sector, setSector] = useState("moda");
  const [brand, setBrand] = useState("Marca Pinterest");
  const [verticalBrief, setVerticalBrief] = useState("moda · hogar · recetas");
  const [targetCpaEur, setTargetCpaEur] = useState("12");
  const [metricsBrief, setMetricsBrief] = useState("Catalog sales + conversión sitio");
  const [busyId, setBusyId] = useState<PinterestAdsLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<PinterestAdsLibraryAgentId, PinterestAdsOutput>>>({});

  const payloadBase = useMemo(() => {
    const raw = targetCpaEur.trim();
    const n = raw ? Number(raw.replace(",", ".")) : NaN;
    return {
      sector,
      brand,
      verticalBrief: verticalBrief.trim() || undefined,
      targetCpaEur: Number.isFinite(n) ? n : undefined,
      metricsBrief: metricsBrief.trim() || undefined,
      metadata: { program: "pinterestads_v1" },
    };
  }, [brand, metricsBrief, sector, targetCpaEur, verticalBrief]);

  const runAgent = useCallback(
    async (agentId: PinterestAdsLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/pinterestads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input: payloadBase }),
        });
        const data = (await res.json()) as { result?: PinterestAdsOutput; error?: string };
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
        <h2 className="text-lg font-semibold" style={{ color: accent }}>
          Pinterest Ads
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
          Marca / cuenta ads
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Vertical Pinterest
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={verticalBrief}
            onChange={(e) => setVerticalBrief(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          CPA objetivo (€)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={targetCpaEur}
            onChange={(e) => setTargetCpaEur(e.target.value)}
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
                className="min-h-[44px] rounded px-3 py-2 text-sm font-semibold text-zinc-50 disabled:opacity-50 md:text-base"
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
                      style={{ borderColor: `${accent}66`, color: accent }}
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
