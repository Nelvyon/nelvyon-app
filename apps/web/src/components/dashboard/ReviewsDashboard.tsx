"use client";

import { useCallback, useMemo, useState } from "react";

type ReviewsSentiment = "positive" | "neutral" | "negative";

type ReviewsAgentId =
  | "reviews-request-crafter"
  | "reviews-sentiment-analyzer"
  | "reviews-response-generator"
  | "reviews-escalation-handler"
  | "reviews-pattern-insight"
  | "reviews-competitor-benchmark"
  | "reviews-testimonial-extractor"
  | "reviews-repair-strategy";

type Row = { id: ReviewsAgentId; title: string; subtitle: string };

type ReviewsOutput = {
  agentId: string;
  content: string;
  score: number;
  sentiment: ReviewsSentiment;
  actions: string[];
};

const accent = "#14b8a6";

const SENTIMENT_COLOR: Record<ReviewsSentiment, string> = {
  positive: "#22c55e",
  neutral: "#71717a",
  negative: "#ef4444",
};

const AGENTS: Row[] = [
  { id: "reviews-request-crafter", title: "Pedir reseña", subtitle: "Mensaje personalizado" },
  { id: "reviews-sentiment-analyzer", title: "Sentimiento", subtitle: "Análisis VoC" },
  { id: "reviews-response-generator", title: "Respuesta", subtitle: "Reply público" },
  { id: "reviews-escalation-handler", title: "Crisis", subtitle: "Negativa crítica" },
  { id: "reviews-pattern-insight", title: "Patrones", subtitle: "Tendencias" },
  { id: "reviews-competitor-benchmark", title: "Benchmark", subtitle: "vs competidor" },
  { id: "reviews-testimonial-extractor", title: "Testimonial", subtitle: "Marketing" },
  { id: "reviews-repair-strategy", title: "Reparación", subtitle: "Plan reputación" },
];

export default function ReviewsDashboard() {
  const [sector, setSector] = useState("retail");
  const [businessName, setBusinessName] = useState("Tienda demo");
  const [platform, setPlatform] = useState("google");
  const [reviewText, setReviewText] = useState(
    "Servicio excelente aunque el envío tardó un día más de lo prometido.",
  );
  const [rating, setRating] = useState("4");
  const [busyId, setBusyId] = useState<ReviewsAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<ReviewsAgentId, ReviewsOutput>>>({});

  const language = useMemo(() => "es", []);

  const runAgent = useCallback(
    async (agentId: ReviewsAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            input: {
              sector: sector.trim(),
              businessName: businessName.trim(),
              platform: platform.trim(),
              reviewText: reviewText.trim(),
              rating: Number(rating) || undefined,
              language,
            },
          }),
        });
        const data = (await res.json()) as { result?: ReviewsOutput; error?: string };
        if (!res.ok) throw new Error(data.error ?? "request_failed");
        if (!data.result) throw new Error("sin resultado");
        setOutputs((prev) => ({ ...prev, [agentId]: data.result! }));
      } catch {
        setStatus(`Error al ejecutar ${agentId}`);
      } finally {
        setBusyId(null);
      }
    },
    [businessName, language, platform, rating, reviewText, sector],
  );

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold" style={{ color: accent }}>
          Reviews automáticos
        </h2>
        {status ? <p className="text-sm text-rose-400">{status}</p> : null}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          Sector
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Negocio
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Plataforma
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Rating (1–5)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-4">
          Texto reseña (opcional)
          <textarea
            className="min-h-[72px] rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {AGENTS.map((a) => {
          const out = outputs[a.id];
          const score = out?.score ?? null;
          const sent = out?.sentiment;
          const sentColor = sent ? SENTIMENT_COLOR[sent] : undefined;
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
                <div className="flex flex-col items-end gap-1">
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
                  {sent ? (
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                      style={{ backgroundColor: sentColor }}
                      title="Sentimiento"
                    >
                      {sent}
                    </span>
                  ) : null}
                </div>
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
              {out?.actions?.length ? (
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-zinc-300">
                  {out.actions.slice(0, 6).map((act, idx) => (
                    <li key={idx}>{act}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Acciones tras ejecutar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
