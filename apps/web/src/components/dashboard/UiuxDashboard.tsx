"use client";

import { useCallback, useMemo, useState } from "react";

type UiuxLibraryAgentId =
  | "uiux-sistema-diseno"
  | "uiux-wireframe"
  | "uiux-componentes"
  | "uiux-auditoria"
  | "uiux-ab-testing"
  | "uiux-accesibilidad"
  | "uiux-dark-mode"
  | "uiux-exportacion";

type Row = { id: UiuxLibraryAgentId; title: string; subtitle: string };

type UiuxOutput = {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
};

const accent = "#22d3ee";

const AGENTS: Row[] = [
  { id: "uiux-sistema-diseno", title: "Sistema diseño", subtitle: "Tokens, tipo, espaciado" },
  { id: "uiux-wireframe", title: "Wireframe", subtitle: "Brief → prototipo IA" },
  { id: "uiux-componentes", title: "Componentes", subtitle: "React + Tailwind" },
  { id: "uiux-auditoria", title: "Auditoría UX", subtitle: "Flujos y fricción" },
  { id: "uiux-ab-testing", title: "A/B testing", subtitle: "Interfaces" },
  { id: "uiux-accesibilidad", title: "Accesibilidad", subtitle: "WCAG AA" },
  { id: "uiux-dark-mode", title: "Dark / light", subtitle: "Theming dual" },
  { id: "uiux-exportacion", title: "Exportación", subtitle: "Figma + Storybook" },
];

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function UiuxDashboard() {
  const [businessName, setBusinessName] = useState("Producto SaaS con design system en evolución");
  const [servicesText, setServicesText] = useState("React, Tailwind, Storybook, Figma");
  const [targetsText, setTargetsText] = useState("B2B, WCAG AA, mobile");
  const [busyId, setBusyId] = useState<UiuxLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<UiuxLibraryAgentId, UiuxOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      businessName,
      services: splitCsv(servicesText),
      targets: splitCsv(targetsText),
      metadata: { program: "uiux_v1" },
    }),
    [businessName, servicesText, targetsText],
  );

  const runAgent = useCallback(
    async (agentId: UiuxLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/uiux", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ agentId, input: payloadBase }),
        });
        const data = (await res.json()) as { result?: UiuxOutput; error?: string };
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
          UI/UX generativo <span style={{ color: accent }}>×</span> NELVYON
        </h2>
        {status ? <p className="text-sm text-rose-400">{status}</p> : null}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Organización / producto
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Stack / servicios (coma)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={servicesText}
            onChange={(e) => setServicesText(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Segmentos / targets (coma)
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
                  <span className="rounded-full px-2 py-0.5 text-xs font-bold text-zinc-950" style={{ backgroundColor: accent }}>
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
