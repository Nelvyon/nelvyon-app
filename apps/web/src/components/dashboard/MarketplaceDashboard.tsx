"use client";

import { useCallback, useMemo, useState } from "react";

type MarketplaceLibraryAgentId =
  | "marketplace-listing"
  | "marketplace-review"
  | "marketplace-payout"
  | "marketplace-qa"
  | "marketplace-category"
  | "marketplace-search"
  | "marketplace-analytics"
  | "marketplace-recommender";

type Row = { id: MarketplaceLibraryAgentId; title: string; subtitle: string };

type MarketplaceOutput = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

const accent = "#a855f7";

const AGENTS: Row[] = [
  { id: "marketplace-listing", title: "Listing", subtitle: "Publicar agente" },
  { id: "marketplace-review", title: "Reviews", subtitle: "Rating ≥3.5" },
  { id: "marketplace-payout", title: "Payouts", subtitle: "70/30 split" },
  { id: "marketplace-qa", title: "QA previo", subtitle: "Seguridad & <3s" },
  { id: "marketplace-category", title: "Categorías", subtitle: "Auto-taxonomía" },
  { id: "marketplace-search", title: "Búsqueda", subtitle: "Semántica" },
  { id: "marketplace-analytics", title: "Analytics", subtitle: "Installs & MRR" },
  { id: "marketplace-recommender", title: "Recomendador", subtitle: "Por sector" },
];

export default function MarketplaceDashboard() {
  const [sector, setSector] = useState("retail");
  const [brand, setBrand] = useState("Mi workspace");
  const [developerId, setDeveloperId] = useState("00000000-0000-0000-0000-00000000d001");
  const [listingAgentId, setListingAgentId] = useState("ext-agent-seo-pro");
  const [priceMonthlyEur, setPriceMonthlyEur] = useState("19");
  const [useCaseBrief, setUseCaseBrief] = useState("Automatizar informes SEO mensuales");
  const [metricsBrief, setMetricsBrief] = useState("Listing nuevo para QA");
  const [busyId, setBusyId] = useState<MarketplaceLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<MarketplaceLibraryAgentId, MarketplaceOutput>>>({});

  const payloadBase = useMemo(() => {
    const p = parseFloat(priceMonthlyEur.replace(",", "."));
    return {
      sector,
      brand,
      developerId: developerId.trim() || undefined,
      listingAgentId: listingAgentId.trim() || undefined,
      priceMonthlyEur: Number.isFinite(p) ? p : undefined,
      useCaseBrief: useCaseBrief.trim() || undefined,
      metricsBrief: metricsBrief.trim() || undefined,
      metadata: { program: "marketplace_v1" },
    };
  }, [brand, developerId, listingAgentId, metricsBrief, priceMonthlyEur, sector, useCaseBrief]);

  const runAgent = useCallback(
    async (agentId: MarketplaceLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/marketplace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input: payloadBase }),
        });
        const data = (await res.json()) as { result?: MarketplaceOutput; error?: string };
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
          Marketplace agentes terceros
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
          Marca / cuenta
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Developer ID
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={developerId}
            onChange={(e) => setDeveloperId(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Listing agent ID
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={listingAgentId}
            onChange={(e) => setListingAgentId(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Precio €/mes
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={priceMonthlyEur}
            onChange={(e) => setPriceMonthlyEur(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Caso de uso (búsqueda / recomendador)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={useCaseBrief}
            onChange={(e) => setUseCaseBrief(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Contexto
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
