"use client";

import { useCallback, useMemo, useState } from "react";

type RestaurantesLibraryAgentId =
  | "restaurantes-restaurantepresencia"
  | "restaurantes-restaurantereviews"
  | "restaurantes-restauranteseolocal"
  | "restaurantes-restaurantemenu"
  | "restaurantes-restaurantereservas"
  | "restaurantes-restauranteemailsms"
  | "restaurantes-restaurantesocial"
  | "restaurantes-restauranteanalytics";

type Row = { id: RestaurantesLibraryAgentId; title: string; subtitle: string };

type RestaurantesOutput = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

const accent = "#f87171";

const AGENTS: Row[] = [
  { id: "restaurantes-restaurantepresencia", title: "Presencia", subtitle: "Top 3" },
  { id: "restaurantes-restaurantereviews", title: "Reviews", subtitle: "<1 h" },
  { id: "restaurantes-restauranteseolocal", title: "SEO local", subtitle: "Maps" },
  { id: "restaurantes-restaurantemenu", title: "Menú", subtitle: "+20%" },
  { id: "restaurantes-restaurantereservas", title: "Reservas", subtitle: "-60%" },
  { id: "restaurantes-restauranteemailsms", title: "Email/SMS", subtitle: "Loyalty" },
  { id: "restaurantes-restaurantesocial", title: "Social", subtitle: "Diario" },
  { id: "restaurantes-restauranteanalytics", title: "Analytics", subtitle: "LTV" },
];

export default function RestaurantesDashboard() {
  const [sector, setSector] = useState("hosteleria");
  const [brand, setBrand] = useState("Restaurante demo");
  const [restaurantesBrief, setRestaurantesBrief] = useState("Restaurantes · reservas · reputación · menú");
  const [metricsBrief, setMetricsBrief] = useState("Maps · reseñas · no-shows · ticket · RRSS");
  const [busyId, setBusyId] = useState<RestaurantesLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<RestaurantesLibraryAgentId, RestaurantesOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      sector,
      brand,
      restaurantesBrief: restaurantesBrief.trim() || undefined,
      metricsBrief: metricsBrief.trim() || undefined,
      metadata: { program: "restaurantes_v1" },
    }),
    [brand, metricsBrief, restaurantesBrief, sector],
  );

  const runAgent = useCallback(
    async (agentId: RestaurantesLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/restaurantes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input: payloadBase }),
        });
        const data = (await res.json()) as { result?: RestaurantesOutput; error?: string };
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
          Restaurantes <span style={{ color: accent }}>×</span> NELVYON
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
          Restaurantes / contexto
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={restaurantesBrief}
            onChange={(e) => setRestaurantesBrief(e.target.value)}
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
                      style={{ borderColor: `${accent}66`, color: "#fecaca" }}
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
