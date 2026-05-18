"use client";

import { useCallback, useMemo, useState } from "react";

type IaPredictivaAgentId =
  | "iapredictiva-churn"
  | "iapredictiva-forecast"
  | "iapredictiva-anomalia"
  | "iapredictiva-segmentacion"
  | "iapredictiva-recomendacion"
  | "iapredictiva-ltv"
  | "iapredictiva-alertas"
  | "iapredictiva-inventario";

type Row = { id: IaPredictivaAgentId; title: string; subtitle: string };

type IaPredictivaOutput = {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
};

const accent = "#a855f7";

const AGENTS: Row[] = [
  { id: "iapredictiva-churn", title: "Churn", subtitle: "30–60 días vista" },
  { id: "iapredictiva-forecast", title: "Forecast", subtitle: "Ventas e ingresos" },
  { id: "iapredictiva-anomalia", title: "Anomalías", subtitle: "Métricas en vivo" },
  { id: "iapredictiva-segmentacion", title: "Segmentación", subtitle: "Comportamiento futuro" },
  { id: "iapredictiva-recomendacion", title: "Recomendación", subtitle: "Producto / servicio IA" },
  { id: "iapredictiva-ltv", title: "LTV", subtitle: "Por cliente" },
  { id: "iapredictiva-alertas", title: "Alertas", subtitle: "Riesgo temprano" },
  { id: "iapredictiva-inventario", title: "Inventario", subtitle: "Demanda prevista" },
];

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function IaPredictivasDashboard() {
  const [businessName, setBusinessName] = useState("Retail omnicanal — catálogo 12k SKU");
  const [servicesText, setServicesText] = useState("Snowflake, dbt, Looker, modelo churn v3");
  const [targetsText, setTargetsText] = useState("Horizonte 60d, EU5, GDPR");
  const [busyId, setBusyId] = useState<IaPredictivaAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<IaPredictivaAgentId, IaPredictivaOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      businessName,
      services: splitCsv(servicesText),
      targets: splitCsv(targetsText),
      metadata: { program: "iapredictiva_v1" as const },
    }),
    [businessName, servicesText, targetsText],
  );

  const runAgent = useCallback(
    async (agentId: IaPredictivaAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/iapredictiva", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ agentId, input: payloadBase }),
        });
        const data = (await res.json()) as { result?: IaPredictivaOutput; error?: string };
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
          IA predictiva negocio <span style={{ color: accent }}>×</span> NELVYON OS
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
