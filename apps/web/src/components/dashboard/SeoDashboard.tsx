"use client";

import { useCallback, useMemo, useState } from "react";

type SeoAgentId =
  | "seo-keyword-research"
  | "seo-content-optimizer"
  | "seo-title-meta"
  | "seo-content-gap"
  | "seo-internal-linking"
  | "seo-schema-markup"
  | "seo-eeat-booster"
  | "seo-sge-readiness";

type Row = { id: SeoAgentId; title: string; subtitle: string };

type SeoOutput = {
  agentId: string;
  content: string;
  score: number;
  recommendations: string[];
  keywords: string[];
};

const accent = "#14b8a6";

const AGENTS: Row[] = [
  { id: "seo-keyword-research", title: "Keywords", subtitle: "Research" },
  { id: "seo-content-optimizer", title: "Contenido", subtitle: "On-page" },
  { id: "seo-title-meta", title: "Title / Meta", subtitle: "CTR" },
  { id: "seo-content-gap", title: "Content gap", subtitle: "vs competencia" },
  { id: "seo-internal-linking", title: "Internos", subtitle: "Hub-Spoke" },
  { id: "seo-schema-markup", title: "Schema", subtitle: "JSON-LD" },
  { id: "seo-eeat-booster", title: "E-E-A-T", subtitle: "Confianza" },
  { id: "seo-sge-readiness", title: "SGE / AI", subtitle: "Citabilidad" },
];

export default function SeoDashboard() {
  const [sector, setSector] = useState("saas");
  const [keyword, setKeyword] = useState("crm para pymes");
  const [url, setUrl] = useState("https://ejemplo.com/guia-crm");
  const [content, setContent] = useState(
    "Introducción breve sobre CRM. Los equipos de ventas necesitan pipeline claro y automatización.",
  );
  const [busyId, setBusyId] = useState<SeoAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<SeoAgentId, SeoOutput>>>({});

  const competitors = useMemo(() => ["competidor-a.com", "competidor-b.com"], []);

  const runAgent = useCallback(
    async (agentId: SeoAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/seo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            input: {
              sector: sector.trim(),
              keyword: keyword.trim(),
              url: url.trim(),
              content: content.trim(),
              competitors,
            },
          }),
        });
        const data = (await res.json()) as { result?: SeoOutput; error?: string };
        if (!res.ok) throw new Error(data.error ?? "request_failed");
        if (!data.result) throw new Error("sin resultado");
        setOutputs((prev) => ({ ...prev, [agentId]: data.result! }));
      } catch {
        setStatus(`Error al ejecutar ${agentId}`);
      } finally {
        setBusyId(null);
      }
    },
    [competitors, content, keyword, sector, url],
  );

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold" style={{ color: accent }}>
          SEO on-page intelligence
        </h2>
        {status ? <p className="text-sm text-rose-400">{status}</p> : null}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Sector
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Keyword foco
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          URL (opcional)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          Contenido / borrador (opcional)
          <textarea
            className="min-h-[80px] rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
            value={content}
            onChange={(e) => setContent(e.target.value)}
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
                {busyId === a.id ? "Ejecutando…" : "Analizar"}
              </button>
              {out?.recommendations?.length ? (
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-zinc-300">
                  {out.recommendations.slice(0, 8).map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Recomendaciones tras ejecutar.</p>
              )}
              {out?.keywords?.length ? (
                <div className="flex flex-wrap gap-1">
                  {out.keywords.slice(0, 12).map((k, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border px-2 py-0.5 text-[10px] text-zinc-200"
                      style={{ borderColor: `${accent}66`, color: accent }}
                    >
                      {k}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Keywords tras ejecutar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
