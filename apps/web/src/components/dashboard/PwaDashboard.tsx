"use client";

import { useCallback, useMemo, useState } from "react";

type PwaAgentId =
  | "pwa-auditoria"
  | "pwa-serviceWorker"
  | "pwa-offline"
  | "pwa-notificaciones"
  | "pwa-instalacion"
  | "pwa-performance"
  | "pwa-sincronizacion"
  | "pwa-responsive";

type Row = { id: PwaAgentId; title: string; subtitle: string };

type PwaOutput = {
  result: string;
  insights: string[];
  recommendedActions: string[];
};

const accent = "#fb923c";

const AGENTS: Row[] = [
  { id: "pwa-auditoria", title: "Auditoría PWA", subtitle: "Manifest · SW · offline · CWV" },
  { id: "pwa-serviceWorker", title: "Service Worker", subtitle: "Caché y ciclo de vida" },
  { id: "pwa-offline", title: "Experiencia Offline", subtitle: "Resiliencia y colas" },
  { id: "pwa-notificaciones", title: "Push Notifications", subtitle: "Permisos y engagement" },
  { id: "pwa-instalacion", title: "Instalación Homescreen", subtitle: "A2HS y onboarding" },
  { id: "pwa-performance", title: "Core Web Vitals", subtitle: "LCP · INP · CLS" },
  { id: "pwa-sincronizacion", title: "Sync Background", subtitle: "Background fetch" },
  { id: "pwa-responsive", title: "Responsive Total", subtitle: "Móvil · tablet · desktop" },
];

export default function PwaDashboard() {
  const [businessContext, setBusinessContext] = useState(
    "Retail Next.js 14: objetivo PWA instalable, carrito usable offline y push de estado de pedido; usuarios mayoritariamente móvil iOS/Android.",
  );
  const [busyId, setBusyId] = useState<PwaAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<PwaAgentId, PwaOutput>>>({});

  const payloadBase = useMemo(() => ({ businessContext }), [businessContext]);

  const runAgent = useCallback(
    async (agentId: PwaAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/pwa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            agentId,
            input: { ...payloadBase, metadata: { program: "pwa_v1" as const } },
          }),
        });
        const data = (await res.json()) as { result?: PwaOutput; error?: string };
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
          PWA multi-dispositivo <span style={{ color: accent }}>×</span> NELVYON OS
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
          Programa: <span className="font-mono text-zinc-400">metadata.program = pwa_v1</span> (incluido en{" "}
          <span className="font-mono text-zinc-400">input</span> al guardar).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {AGENTS.map((a) => {
          const out = outputs[a.id];
          const nInsights = out?.insights?.length ?? 0;
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
                {nInsights > 0 ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-bold text-zinc-950"
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
                className="min-h-[44px] rounded px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50 md:text-base"
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
          );
        })}
      </div>
    </section>
  );
}
