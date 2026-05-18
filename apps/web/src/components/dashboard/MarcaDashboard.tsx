"use client";

import { useCallback, useMemo, useState } from "react";

type MarcaLibraryAgentId =
  | "marca-identidad"
  | "marca-posicionamiento"
  | "marca-tono-comunicacion"
  | "marca-naming"
  | "marca-arquitectura"
  | "marca-consistencia"
  | "marca-perception"
  | "marca-evolucion";

type Row = { id: MarcaLibraryAgentId; title: string; subtitle: string };

type MarcaOutput = {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
};

const accent = "#e879f9";

const AGENTS: Row[] = [
  { id: "marca-identidad", title: "Identidad", subtitle: "Guidelines visuales" },
  { id: "marca-posicionamiento", title: "Posicionamiento", subtitle: "Propuesta de valor" },
  { id: "marca-tono-comunicacion", title: "Tono", subtitle: "Guía de comunicación" },
  { id: "marca-naming", title: "Naming", subtitle: "Taglines y vocabulario" },
  { id: "marca-arquitectura", title: "Arquitectura", subtitle: "Submarcas" },
  { id: "marca-consistencia", title: "Consistencia", subtitle: "Auditoría multicanal" },
  { id: "marca-perception", title: "Percepción", subtitle: "Competencia" },
  { id: "marca-evolucion", title: "Evolución", subtitle: "Nuevos mercados" },
];

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function MarcaDashboard() {
  const [businessName, setBusinessName] = useState("Marca demo");
  const [industry, setIndustry] = useState("SaaS B2B productivity");
  const [targetsText, setTargetsText] = useState("PME Europa, decision makers IT, inversores Serie A");
  const [busyId, setBusyId] = useState<MarcaLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<MarcaLibraryAgentId, MarcaOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      businessName,
      industry: industry.trim(),
      targets: splitCsv(targetsText),
      metadata: { program: "marca_v1" },
    }),
    [businessName, industry, targetsText],
  );

  const runAgent = useCallback(
    async (agentId: MarcaLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/marca", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input: payloadBase }),
        });
        const data = (await res.json()) as { result?: MarcaOutput; error?: string };
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
          Estrategia de marca global <span style={{ color: accent }}>×</span> NELVYON
        </h2>
        {status ? <p className="text-sm text-rose-400">{status}</p> : null}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Marca / organización
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Industria / categoría
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Mercados / audiencias (coma)
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
              {out?.recommendations?.length ? (
                <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto text-xs text-zinc-300">
                  {out.recommendations.slice(0, 6).map((h, idx) => (
                    <li key={idx} className="rounded border border-zinc-800 bg-zinc-950/50 p-1.5">
                      {h.length > 160 ? `${h.slice(0, 160)}…` : h}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Recomendaciones tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
