"use client";

import { useCallback, useMemo, useState } from "react";

type CreativeLibraryAgentId =
  | "creative-brand-voice"
  | "creative-ad-copy"
  | "creative-video-script"
  | "creative-slide-decks"
  | "creative-tagline-generator"
  | "creative-product-desc"
  | "creative-naming"
  | "creative-repurposer";

type Row = { id: CreativeLibraryAgentId; title: string; subtitle: string };

type CreativeOutput = {
  agentId: string;
  content: string;
  score: number;
  variants: string[];
  formats: string[];
};

const accent = "#14b8a6";

const AGENTS: Row[] = [
  { id: "creative-brand-voice", title: "Brand voice", subtitle: "Guía de voz" },
  { id: "creative-ad-copy", title: "Ad copy", subtitle: "Google/Meta/Display" },
  { id: "creative-video-script", title: "Video script", subtitle: "15/30/60s" },
  { id: "creative-slide-decks", title: "Slides", subtitle: "Pitch" },
  { id: "creative-tagline-generator", title: "Taglines", subtitle: "Slogans" },
  { id: "creative-product-desc", title: "Producto", subtitle: "eCommerce" },
  { id: "creative-naming", title: "Naming", subtitle: "Dominios" },
  { id: "creative-repurposer", title: "Repurpose", subtitle: "5 formatos" },
];

export default function CreativeDashboard() {
  const [sector, setSector] = useState("consumer");
  const [brand, setBrand] = useState("Marca demo");
  const [format, setFormat] = useState("multiformato");
  const [targetAudience, setTargetAudience] = useState("Millennials urbanos");
  const [goal, setGoal] = useState("Awareness + consideración");
  const [tone, setTone] = useState("audaz y cercano");
  const [busyId, setBusyId] = useState<CreativeLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<CreativeLibraryAgentId, CreativeOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      sector,
      brand,
      format,
      targetAudience,
      goal,
      tone,
    }),
    [brand, format, goal, sector, targetAudience, tone],
  );

  const runAgent = useCallback(
    async (agentId: CreativeLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/creative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            input: {
              sector: payloadBase.sector.trim(),
              brand: payloadBase.brand.trim(),
              format: payloadBase.format.trim(),
              targetAudience: payloadBase.targetAudience.trim(),
              goal: payloadBase.goal.trim(),
              tone: payloadBase.tone.trim(),
            },
          }),
        });
        const data = (await res.json()) as { result?: CreativeOutput; error?: string };
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
          Creative library
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
          Marca
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Formato
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Audiencia
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          Objetivo
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tono
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
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
              {out?.variants?.length ? (
                <ul className="mt-1 max-h-36 space-y-2 overflow-y-auto text-xs text-zinc-300">
                  {out.variants.slice(0, 8).map((v, idx) => (
                    <li key={idx} className="rounded border border-zinc-800 bg-zinc-950/50 p-2">
                      {v.length > 200 ? `${v.slice(0, 200)}…` : v}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Variantes tras generar.</p>
              )}
              {out?.formats?.length ? (
                <div className="flex flex-wrap gap-1">
                  {out.formats.slice(0, 10).map((f, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border px-2 py-0.5 text-[10px] text-zinc-200"
                      style={{ borderColor: `${accent}66`, color: accent }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Formatos tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
