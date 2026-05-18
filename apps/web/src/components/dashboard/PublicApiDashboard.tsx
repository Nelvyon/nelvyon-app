"use client";

import { useCallback, useMemo, useState } from "react";

type PublicApiLibraryAgentId =
  | "publicapi-auth"
  | "publicapi-rate-limiter"
  | "publicapi-router"
  | "publicapi-docs"
  | "publicapi-webhook"
  | "publicapi-webhook-dispatch"
  | "publicapi-analytics"
  | "publicapi-sandbox";

type Row = { id: PublicApiLibraryAgentId; title: string; subtitle: string };

type PublicApiOutput = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

const accent = "#22d3ee";

const AGENTS: Row[] = [
  { id: "publicapi-auth", title: "API keys", subtitle: "nlv_live / nlv_test" },
  { id: "publicapi-rate-limiter", title: "Rate limit", subtitle: "100 / 1k / 10k h" },
  { id: "publicapi-router", title: "Router", subtitle: "→ agentes OS" },
  { id: "publicapi-docs", title: "OpenAPI 3", subtitle: "Docs auto" },
  { id: "publicapi-webhook", title: "Webhooks", subtitle: "Suscripciones" },
  { id: "publicapi-webhook-dispatch", title: "Dispatch", subtitle: "Retry 1·5·25s" },
  { id: "publicapi-analytics", title: "Analytics", subtitle: "p95 & top paths" },
  { id: "publicapi-sandbox", title: "Sandbox", subtitle: "Sin datos reales" },
];

export default function PublicApiDashboard() {
  const [sector, setSector] = useState("integrations");
  const [brand, setBrand] = useState("Mi SaaS");
  const [plan, setPlan] = useState<"starter" | "pro" | "agency">("pro");
  const [webhookEvent, setWebhookEvent] = useState("billing.paid");
  const [endpointBrief, setEndpointBrief] = useState("POST /v2/agents/seo/run");
  const [metricsBrief, setMetricsBrief] = useState("Integración Zapier");
  const [busyId, setBusyId] = useState<PublicApiLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<PublicApiLibraryAgentId, PublicApiOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      sector,
      brand,
      plan,
      webhookEvent,
      endpointBrief: endpointBrief.trim() || undefined,
      metricsBrief: metricsBrief.trim() || undefined,
      metadata: { program: "publicapi_v2_webhooks_v1" },
    }),
    [brand, endpointBrief, metricsBrief, plan, sector, webhookEvent],
  );

  const runAgent = useCallback(
    async (agentId: PublicApiLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/publicapi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input: payloadBase }),
        });
        const data = (await res.json()) as { result?: PublicApiOutput; error?: string };
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
          API pública v2 + Webhooks
        </h2>
        {status ? <p className="text-sm text-rose-400">{status}</p> : null}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Sector / integración
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
          Plan API
          <select
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={plan}
            onChange={(e) => setPlan(e.target.value as "starter" | "pro" | "agency")}
          >
            <option value="starter">Starter (100/h)</option>
            <option value="pro">Pro (1000/h)</option>
            <option value="agency">Agency (10000/h)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          Evento webhook
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={webhookEvent}
            onChange={(e) => setWebhookEvent(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Endpoint (router)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={endpointBrief}
            onChange={(e) => setEndpointBrief(e.target.value)}
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
