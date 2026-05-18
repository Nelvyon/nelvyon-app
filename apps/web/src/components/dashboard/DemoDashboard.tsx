"use client";

import { useCallback, useMemo, useState } from "react";

type DemoLibraryAgentId =
  | "demo-personalization"
  | "demo-script-generator"
  | "demo-value-proposition"
  | "demo-objection-handler"
  | "demo-sandbox-data"
  | "demo-conversion-nudge"
  | "demo-follow-up-sequence"
  | "demo-analytics-insight";

type Row = { id: DemoLibraryAgentId; title: string; subtitle: string };

type DemoOutput = {
  agentId: string;
  content: string;
  score: number;
  demoSteps: string[];
  ctaMessages: string[];
};

const accent = "#14b8a6";

const AGENTS: Row[] = [
  { id: "demo-personalization", title: "Personalización", subtitle: "Perfil visitante" },
  { id: "demo-script-generator", title: "Guión", subtitle: "Demo interactiva" },
  { id: "demo-value-proposition", title: "Valor", subtitle: "Propuesta" },
  { id: "demo-objection-handler", title: "Objeciones", subtitle: "Respuestas" },
  { id: "demo-sandbox-data", title: "Sandbox", subtitle: "Datos muestra" },
  { id: "demo-conversion-nudge", title: "Conversión", subtitle: "Nudges" },
  { id: "demo-follow-up-sequence", title: "Follow-up", subtitle: "Post-demo" },
  { id: "demo-analytics-insight", title: "Analytics", subtitle: "Optimización" },
];

export default function DemoDashboard() {
  const [sector, setSector] = useState("saas");
  const [visitorType, setVisitorType] = useState("product manager");
  const [useCase, setUseCase] = useState("onboarding equipos");
  const [companySize, setCompanySize] = useState("50-200");
  const [painPoint, setPainPoint] = useState("Tiempo perdido en reporting");
  const [busyId, setBusyId] = useState<DemoLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<DemoLibraryAgentId, DemoOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      sector,
      visitorType,
      useCase,
      companySize,
      painPoint,
    }),
    [companySize, painPoint, sector, useCase, visitorType],
  );

  const runAgent = useCallback(
    async (agentId: DemoLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            input: {
              sector: payloadBase.sector.trim(),
              visitorType: payloadBase.visitorType.trim(),
              useCase: payloadBase.useCase.trim(),
              companySize: payloadBase.companySize.trim(),
              painPoint: payloadBase.painPoint.trim(),
            },
          }),
        });
        const data = (await res.json()) as { result?: DemoOutput; error?: string };
        if (!res.ok) throw new Error(data.error ?? "request_failed");
        if (!data.result) throw new Error("sin resultado");
        setOutputs((prev) => ({ ...prev, [agentId]: data.result! }));
      } catch {
        setStatus(`Error al ejecutar ${agentId}`);
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
          Demo interactiva sin registro
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
          Tipo visitante
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={visitorType}
            onChange={(e) => setVisitorType(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Caso de uso
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tamaño empresa
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={companySize}
            onChange={(e) => setCompanySize(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Pain point
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={painPoint}
            onChange={(e) => setPainPoint(e.target.value)}
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
                {busyId === a.id ? "Ejecutando…" : "Generar"}
              </button>
              {out?.demoSteps?.length ? (
                <ol className="mt-1 max-h-36 list-decimal space-y-1 overflow-y-auto pl-4 text-xs text-zinc-300">
                  {out.demoSteps.slice(0, 8).map((s, idx) => (
                    <li key={idx} className="rounded border border-zinc-800 bg-zinc-950/50 p-1.5 pl-2">
                      {s.length > 180 ? `${s.slice(0, 180)}…` : s}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-zinc-500">Pasos de demo tras generar.</p>
              )}
              {out?.ctaMessages?.length ? (
                <div className="flex flex-wrap gap-1">
                  {out.ctaMessages.slice(0, 10).map((c, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border px-2 py-0.5 text-[10px] text-zinc-200"
                      style={{ borderColor: `${accent}66`, color: accent }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">CTAs tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
