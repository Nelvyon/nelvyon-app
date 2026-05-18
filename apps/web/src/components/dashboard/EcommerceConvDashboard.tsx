"use client";

import { useCallback, useMemo, useState } from "react";

type EcommerceConvAgentId =
  | "ecommerceconv-carrito"
  | "ecommerceconv-upsell"
  | "ecommerceconv-producto"
  | "ecommerceconv-checkout"
  | "ecommerceconv-personalizacion"
  | "ecommerceconv-reviews"
  | "ecommerceconv-fidelizacion"
  | "ecommerceconv-precios";

type Row = { id: EcommerceConvAgentId; title: string; subtitle: string };

type EcommerceConvOutput = {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
};

const accent = "#f97316";

const AGENTS: Row[] = [
  { id: "ecommerceconv-carrito", title: "Carrito", subtitle: "Abandonados automáticos" },
  { id: "ecommerceconv-upsell", title: "Upsell / cross-sell", subtitle: "IA en funnel" },
  { id: "ecommerceconv-producto", title: "Producto", subtitle: "PDP copy + imágenes IA" },
  { id: "ecommerceconv-checkout", title: "Checkout", subtitle: "Menos fricción" },
  { id: "ecommerceconv-personalizacion", title: "Personalización", subtitle: "RT por comportamiento" },
  { id: "ecommerceconv-reviews", title: "Reviews", subtitle: "Automáticas + moderación" },
  { id: "ecommerceconv-fidelizacion", title: "Fidelización", subtitle: "Programa automático" },
  { id: "ecommerceconv-precios", title: "Precios", subtitle: "Dinámicos por demanda" },
];

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function EcommerceConvDashboard() {
  const [businessName, setBusinessName] = useState("Tienda DTC demo — moda sostenible");
  const [servicesText, setServicesText] = useState("Shopify, Klaviyo, reviews app, A/B testing");
  const [targetsText, setTargetsText] = useState("Europa, mobile-first, Gen Z");
  const [busyId, setBusyId] = useState<EcommerceConvAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<EcommerceConvAgentId, EcommerceConvOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      businessName,
      services: splitCsv(servicesText),
      targets: splitCsv(targetsText),
      metadata: { program: "ecommerceconv_v1" as const },
    }),
    [businessName, servicesText, targetsText],
  );

  const runAgent = useCallback(
    async (agentId: EcommerceConvAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/ecommerceconv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ agentId, input: payloadBase }),
        });
        const data = (await res.json()) as { result?: EcommerceConvOutput; error?: string };
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
          Ecommerce conversional <span style={{ color: accent }}>×</span> NELVYON OS
        </h2>
        {status ? <p className="text-sm text-rose-400">{status}</p> : null}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Tienda / marca
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Stack / herramientas (coma)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={servicesText}
            onChange={(e) => setServicesText(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Mercados / audiencia (coma)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={targetsText}
            onChange={(e) => setTargetsText(e.target.value)}
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
                {busyId === a.id ? "Ejecutando…" : "Ejecutar"}
              </button>
              {out?.result ? <p className="line-clamp-3 text-xs text-zinc-400">{out.result}</p> : null}
              {out?.recommendations?.length ? (
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-zinc-300">
                  {out.recommendations.slice(0, 5).map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Recomendaciones tras ejecutar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
