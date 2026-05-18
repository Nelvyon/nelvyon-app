"use client";

import { useCallback, useMemo, useState } from "react";

type PrestaShopLibraryAgentId =
  | "prestashop-auth"
  | "prestashop-product"
  | "prestashop-order"
  | "prestashop-abandoned-cart"
  | "prestashop-seo"
  | "prestashop-review"
  | "prestashop-analytics"
  | "prestashop-email";

type Row = { id: PrestaShopLibraryAgentId; title: string; subtitle: string };

type PrestaShopOutput = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

const accent = "#df0067";

const AGENTS: Row[] = [
  { id: "prestashop-auth", title: "WebService", subtitle: "API Key PrestaShop" },
  { id: "prestashop-product", title: "Productos", subtitle: "Sync catálogo" },
  { id: "prestashop-order", title: "Pedidos", subtitle: "Post-compra" },
  { id: "prestashop-abandoned-cart", title: "Carrito", subtitle: "1h·24h·72h" },
  { id: "prestashop-seo", title: "SEO", subtitle: "Title · URL" },
  { id: "prestashop-review", title: "Reviews", subtitle: "D+7" },
  { id: "prestashop-analytics", title: "Analytics", subtitle: "AOV & LTV" },
  { id: "prestashop-email", title: "Email", subtitle: "ES · FR · IT" },
];

export default function PrestaShopDashboard() {
  const [sector, setSector] = useState("ecommerce");
  const [brand, setBrand] = useState("Mi tienda PS");
  const [storeUrl, setStoreUrl] = useState("https://tienda.example.com");
  const [segment, setSegment] = useState<"one_time" | "recurring" | "vip">("recurring");
  const [metricsBrief, setMetricsBrief] = useState("Mercados ES/FR/IT · carrito abandonado");
  const [busyId, setBusyId] = useState<PrestaShopLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<PrestaShopLibraryAgentId, PrestaShopOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      sector,
      brand,
      storeUrl: storeUrl.trim() || undefined,
      segment,
      metricsBrief: metricsBrief.trim() || undefined,
      metadata: { program: "prestashop_v1" },
    }),
    [brand, metricsBrief, sector, segment, storeUrl],
  );

  const runAgent = useCallback(
    async (agentId: PrestaShopLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/prestashop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input: payloadBase }),
        });
        const data = (await res.json()) as { result?: PrestaShopOutput; error?: string };
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
          PrestaShop <span style={{ color: accent }}>×</span> NELVYON
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
          Marca / tienda
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          URL tienda
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Segmento
          <select
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={segment}
            onChange={(e) => setSegment(e.target.value as "one_time" | "recurring" | "vip")}
          >
            <option value="one_time">Una vez</option>
            <option value="recurring">Recurrentes</option>
            <option value="vip">VIP</option>
          </select>
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
