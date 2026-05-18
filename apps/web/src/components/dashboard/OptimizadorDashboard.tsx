"use client";

import { useCallback, useMemo, useState } from "react";

type OptimizadorAgentId =
  | "optimizador-campanas"
  | "optimizador-presupuesto"
  | "optimizador-anuncios"
  | "optimizador-copy"
  | "optimizador-canales"
  | "optimizador-abtest"
  | "optimizador-reportes"
  | "optimizador-aprendizaje";

type Row = { id: OptimizadorAgentId; title: string; subtitle: string };

type OptimizadorOutput = {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
};

const accent = "#22c55e";

const AGENTS: Row[] = [
  { id: "optimizador-campanas", title: "Campañas", subtitle: "Orquestación autónoma" },
  { id: "optimizador-presupuesto", title: "Presupuesto", subtitle: "ROI en tiempo real" },
  { id: "optimizador-anuncios", title: "Anuncios", subtitle: "Pausa / activación" },
  { id: "optimizador-copy", title: "Copy", subtitle: "Reescritura bajo CTR" },
  { id: "optimizador-canales", title: "Canales", subtitle: "Redistribución mix" },
  { id: "optimizador-abtest", title: "A/B test", subtitle: "Continuo sin fricción" },
  { id: "optimizador-reportes", title: "Reportes", subtitle: "Semanal automático" },
  { id: "optimizador-aprendizaje", title: "Aprendizaje", subtitle: "Memoria acumulativa" },
];

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function OptimizadorDashboard() {
  const [businessName, setBusinessName] = useState("Ecommerce D2C — campañas Meta + Google + TikTok");
  const [servicesText, setServicesText] = useState("GA4, Ads APIs, feed catálogo, reglas ROI");
  const [targetsText, setTargetsText] = useState("ROAS mínimo 2.2, CTR piso 0.9%, EU");
  const [busyId, setBusyId] = useState<OptimizadorAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<OptimizadorAgentId, OptimizadorOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      businessName,
      services: splitCsv(servicesText),
      targets: splitCsv(targetsText),
      metadata: { program: "optimizador_v1" as const },
    }),
    [businessName, servicesText, targetsText],
  );

  const runAgent = useCallback(
    async (agentId: OptimizadorAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/optimizador", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ agentId, input: payloadBase }),
        });
        const data = (await res.json()) as { result?: OptimizadorOutput; error?: string };
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
          Optimizador continuo <span style={{ color: accent }}>×</span> NELVYON OS
        </h2>
        {status ? <p className="text-sm text-rose-400">{status}</p> : null}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Negocio / unidad
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Datos / fuentes (coma)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={servicesText}
            onChange={(e) => setServicesText(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Horizonte / mercados (coma)
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
