"use client";

import { useCallback, useMemo, useState } from "react";

type TestimonialsLibraryAgentId =
  | "testimonials-case-study-builder"
  | "testimonials-quote-extractor"
  | "testimonials-video-script"
  | "testimonials-social-proof"
  | "testimonials-outreach-request"
  | "testimonials-roi-calculator"
  | "testimonials-comparison"
  | "testimonials-distribution";

type Row = { id: TestimonialsLibraryAgentId; title: string; subtitle: string };

type TestimonialsOutput = {
  agentId: string;
  content: string;
  score: number;
  quotes: string[];
  formats: string[];
};

const accent = "#14b8a6";

const AGENTS: Row[] = [
  { id: "testimonials-case-study-builder", title: "Case study", subtitle: "P-S-R" },
  { id: "testimonials-quote-extractor", title: "Citas", subtitle: "Landing / ads" },
  { id: "testimonials-video-script", title: "Video", subtitle: "Testimonial" },
  { id: "testimonials-social-proof", title: "RRSS", subtitle: "Social proof" },
  { id: "testimonials-outreach-request", title: "Outreach", subtitle: "Pedir testimonio" },
  { id: "testimonials-roi-calculator", title: "ROI", subtitle: "Cifras" },
  { id: "testimonials-comparison", title: "Antes / después", subtitle: "Comparativa" },
  { id: "testimonials-distribution", title: "Distribución", subtitle: "Multicanal" },
];

export default function TestimonialsDashboard() {
  const [sector, setSector] = useState("b2b");
  const [clientName, setClientName] = useState("Cliente demo S.L.");
  const [result, setResult] = useState("+32% leads calificados en 90 días");
  const [industry, setIndustry] = useState("software");
  const [challenge, setChallenge] = useState("Baja conversión formulario demo");
  const [solution, setSolution] = useState("Refactor funnel + scoring");
  const [busyId, setBusyId] = useState<TestimonialsLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<TestimonialsLibraryAgentId, TestimonialsOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      sector,
      clientName,
      result,
      industry,
      challenge,
      solution,
    }),
    [challenge, clientName, industry, result, sector, solution],
  );

  const runAgent = useCallback(
    async (agentId: TestimonialsLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/testimonials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            input: {
              sector: payloadBase.sector.trim(),
              clientName: payloadBase.clientName.trim(),
              result: payloadBase.result.trim(),
              industry: payloadBase.industry.trim(),
              challenge: payloadBase.challenge.trim(),
              solution: payloadBase.solution.trim(),
            },
          }),
        });
        const data = (await res.json()) as { result?: TestimonialsOutput; error?: string };
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
          Testimonios y casos de éxito
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
          Cliente
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Industria
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Resultado
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={result}
            onChange={(e) => setResult(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          Desafío
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={challenge}
            onChange={(e) => setChallenge(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          Solución
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
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
              {out?.quotes?.length ? (
                <ul className="mt-1 max-h-36 space-y-2 overflow-y-auto text-xs text-zinc-300">
                  {out.quotes.slice(0, 8).map((q, idx) => (
                    <li key={idx} className="rounded border border-zinc-800 bg-zinc-950/50 p-2">
                      {q.length > 200 ? `${q.slice(0, 200)}…` : q}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Citas tras generar.</p>
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
