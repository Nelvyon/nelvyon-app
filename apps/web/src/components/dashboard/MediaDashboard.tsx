"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "media-newsletter-writer"
  | "media-audience-growth"
  | "media-monetization"
  | "media-content-calendar"
  | "media-sponsor-pitch"
  | "media-seo-articles"
  | "media-podcast-script"
  | "media-viral-hooks"
  | "media-email-sequence";
type ContentFormat = "newsletter" | "podcast" | "blog" | "video" | "social";
type Tone = "profesional" | "casual" | "inspiracional" | "educativo";

const AGENTS: Array<{ id: AgentId; name: string; description: string }> = [
  { id: "media-newsletter-writer", name: "Newsletter Writer", description: "Borradores, asuntos y estructuras de envío." },
  { id: "media-audience-growth", name: "Audience Growth", description: "Estrategia para crecer suscriptores y alcance." },
  { id: "media-monetization", name: "Monetización", description: "Patrocinio, afiliados y productos digitales." },
  { id: "media-content-calendar", name: "Content Calendar", description: "Planning editorial multidía y repurposing." },
  { id: "media-sponsor-pitch", name: "Sponsor Pitch", description: "One-pager y propuesta para marcas." },
  { id: "media-seo-articles", name: "SEO Articles", description: "Outlines y metadatos para artículos long-form." },
  { id: "media-podcast-script", name: "Podcast Script", description: "Guión de episodio con bloques de tiempo." },
  { id: "media-viral-hooks", name: "Viral Hooks", description: "Ideas de apertura para contenido corto." },
  { id: "media-email-sequence", name: "Email Sequence", description: "Secuencias automatizadas y nurturing." },
];

export default function MediaDashboard() {
  const [agentId, setAgentId] = useState<AgentId>("media-newsletter-writer");
  const [niche, setNiche] = useState("");
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState<ContentFormat>("newsletter");
  const [audienceSizeInput, setAudienceSizeInput] = useState("");
  const [tone, setTone] = useState<Tone>("profesional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ agentId: string; result: string; generatedAt: string } | null>(null);
  const active = useMemo(() => AGENTS.find((a) => a.id === agentId) ?? AGENTS[0], [agentId]);

  async function runAgent(): Promise<void> {
    setLoading(true);
    setError("");
    setResult(null);
    const audienceParsed = audienceSizeInput.trim() === "" ? undefined : Number.parseInt(audienceSizeInput, 10);
    const audienceSize = audienceParsed !== undefined && !Number.isNaN(audienceParsed) ? audienceParsed : undefined;
    try {
      const response = await fetch("/api/os/agents/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agentId,
          input: {
            niche,
            topic,
            format,
            tone,
            ...(audienceSize !== undefined ? { audienceSize } : {}),
          },
        }),
      });
      const data = (await response.json()) as { success?: boolean; result?: { agentId: string; result: string; generatedAt: string }; error?: string };
      if (!response.ok || !data.success || !data.result) throw new Error(data.error ?? "Error procesando solicitud");
      setResult(data.result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function copyResult(): Promise<void> {
    if (!result?.result) return;
    await navigator.clipboard.writeText(result.result);
  }

  return (
    <div className="min-h-[560px] rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-xl">
      <h2 className="mb-1 text-xl font-semibold text-white">Media &amp; newsletters — Lote 33</h2>
      <p className="mb-4 text-sm text-slate-400">9 agentes para newsletters, podcasts, SEO y monetización editorial.</p>
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
          {AGENTS.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => setAgentId(agent.id)}
              className={`w-full rounded-lg border p-3 text-left ${agent.id === agentId ? "border-indigo-500/50 bg-indigo-950/35" : "border-slate-800 bg-slate-900/50"}`}
            >
              <p className="text-sm font-medium text-white">{agent.name}</p>
              <p className="mt-1 text-xs text-slate-400">{agent.description}</p>
            </button>
          ))}
        </div>
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <p className="mb-3 text-sm font-medium text-slate-200">{active.name}</p>
            <div className="grid gap-3">
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nicho (ej. finanzas personales)" value={niche} onChange={(e) => setNiche(e.target.value)} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Tema / episodio / keyword" value={topic} onChange={(e) => setTopic(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={format} onChange={(e) => setFormat(e.target.value as ContentFormat)}>
                <option value="newsletter">Newsletter</option>
                <option value="podcast">Podcast</option>
                <option value="blog">Blog</option>
                <option value="video">Video</option>
                <option value="social">Social</option>
              </select>
              <input
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                placeholder="Tamaño audiencia (opcional)"
                inputMode="numeric"
                value={audienceSizeInput}
                onChange={(e) => setAudienceSizeInput(e.target.value)}
              />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="profesional">Profesional</option>
                <option value="casual">Casual</option>
                <option value="inspiracional">Inspiracional</option>
                <option value="educativo">Educativo</option>
              </select>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => runAgent().catch(() => setError("Error"))}
              className="mt-4 rounded px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: "#6366f1" }}
            >
              {loading ? "Generando..." : "Ejecutar agente"}
            </button>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-200">Resultado</p>
              <button type="button" onClick={() => copyResult().catch(() => {})} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200" disabled={!result?.result}>
                Copiar
              </button>
            </div>
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">{result?.result ? result.result : "Sin resultado todavía."}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
