"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "elevator-pitch"
  | "investor-deck-narrative"
  | "product-hunt-launch"
  | "tech-blog-content"
  | "developer-community"
  | "competitive-positioning"
  | "growth-hacking"
  | "job-description-tech"
  | "pr-and-media"
  | "onboarding-email-sequence"
  | "startup-social-media";
type Stage = "idea" | "mvp" | "seed" | "series-a" | "growth";
type Tone = "tecnico" | "visionario" | "cercano" | "directo";

const AGENTS: Array<{ id: AgentId; name: string; description: string }> = [
  { id: "elevator-pitch", name: "Elevator Pitch", description: "Pitch 30s/1m/3m" },
  { id: "investor-deck-narrative", name: "Investor Deck Narrative", description: "Narrativa de 12 slides" },
  { id: "product-hunt-launch", name: "Product Hunt Launch", description: "Campaña de lanzamiento PH" },
  { id: "tech-blog-content", name: "Tech Blog Content", description: "Contenido técnico SEO" },
  { id: "developer-community", name: "Developer Community", description: "Estrategia comunidad dev" },
  { id: "competitive-positioning", name: "Competitive Positioning", description: "Battlecards y diferenciación" },
  { id: "growth-hacking", name: "Growth Hacking", description: "Experimentos ICE + AARRR" },
  { id: "job-description-tech", name: "Job Description Tech", description: "JDs para talento top" },
  { id: "pr-and-media", name: "PR & Media", description: "PR kit para startup" },
  { id: "onboarding-email-sequence", name: "Onboarding Emails", description: "Secuencia días 0-30" },
  { id: "startup-social-media", name: "Startup Social Media", description: "Plan LinkedIn/X/TikTok" },
];

export default function StartupsDashboard() {
  const [agentId, setAgentId] = useState<AgentId>("elevator-pitch");
  const [startupName, setStartupName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [stage, setStage] = useState<Stage>("mvp");
  const [tone, setTone] = useState<Tone>("directo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ agentId: string; result: string; generatedAt: string } | null>(null);
  const active = useMemo(() => AGENTS.find((a) => a.id === agentId) ?? AGENTS[0], [agentId]);

  async function runAgent(): Promise<void> {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/os/agents/startups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ agentId, input: { startupName, productDescription, targetMarket, stage, tone } }),
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
      <h2 className="mb-1 text-xl font-semibold text-white">Startups - Lote 15</h2>
      <p className="mb-4 text-sm text-slate-400">11 agentes para startups y empresas tecnologicas.</p>
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-2">
          {AGENTS.map((agent) => (
            <button key={agent.id} type="button" onClick={() => setAgentId(agent.id)} className={`w-full rounded-lg border p-3 text-left ${agent.id === agentId ? "border-sky-500/50 bg-sky-950/30" : "border-slate-800 bg-slate-900/50"}`}>
              <p className="text-sm font-medium text-white">{agent.name}</p>
              <p className="mt-1 text-xs text-slate-400">{agent.description}</p>
            </button>
          ))}
        </div>
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <p className="mb-3 text-sm font-medium text-slate-200">{active.name}</p>
            <div className="grid gap-3">
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Startup name" value={startupName} onChange={(e) => setStartupName(e.target.value)} />
              <textarea className="min-h-[90px] rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Product description" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Target market" value={targetMarket} onChange={(e) => setTargetMarket(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
                <option value="idea">idea</option><option value="mvp">mvp</option><option value="seed">seed</option><option value="series-a">series-a</option><option value="growth">growth</option>
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="tecnico">tecnico</option><option value="visionario">visionario</option><option value="cercano">cercano</option><option value="directo">directo</option>
              </select>
            </div>
            <button type="button" disabled={loading} onClick={() => runAgent().catch(() => setError("Error"))} className="mt-4 rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Generando..." : "Ejecutar agente"}</button>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-200">Resultado</p>
              <button type="button" onClick={() => copyResult().catch(() => {})} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200" disabled={!result?.result}>Copiar</button>
            </div>
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">{result?.result ? result.result : "Sin resultado todavia."}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

