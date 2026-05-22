"use client";

import { useMemo, useRef, useState } from "react";

import { AgentListenButton } from "@/components/agents/AgentListenButton";
import { streamAgentChat } from "@/lib/agentStream";

type AgentId =
  | "fashion-brand-story"
  | "fashion-product-description"
  | "fashion-instagram"
  | "fashion-influencer-brief"
  | "fashion-email-campaign"
  | "fashion-lookbook-copy"
  | "fashion-seo"
  | "fashion-ugc-strategy"
  | "fashion-seasonal-campaign"
  | "fashion-retention";
type Category = "moda-mujer" | "moda-hombre" | "moda-infantil" | "belleza" | "cosmética" | "skincare" | "joyería" | "calzado" | "lifestyle";
type PriceRange = "mass-market" | "mid-range" | "premium" | "luxury";
type Tone = "editorial" | "cercano" | "aspiracional" | "sostenible" | "divertido";

const AGENTS: Array<{ id: AgentId; name: string; description: string }> = [
  { id: "fashion-brand-story", name: "Fashion Brand Story", description: "Historia y manifiesto de marca" },
  { id: "fashion-product-description", name: "Fashion Product Description", description: "Descripciones que venden" },
  { id: "fashion-instagram", name: "Fashion Instagram", description: "Plan mensual de Instagram" },
  { id: "fashion-influencer-brief", name: "Fashion Influencer Brief", description: "Brief completo de colaboración" },
  { id: "fashion-email-campaign", name: "Fashion Email Campaign", description: "Campañas de email por objetivos" },
  { id: "fashion-lookbook-copy", name: "Fashion Lookbook Copy", description: "Copy editorial de colección" },
  { id: "fashion-seo", name: "Fashion SEO", description: "SEO de tienda y contenido" },
  { id: "fashion-ugc-strategy", name: "Fashion UGC Strategy", description: "Programa UGC y reseñas" },
  { id: "fashion-seasonal-campaign", name: "Fashion Seasonal Campaign", description: "Campaña estacional completa" },
  { id: "fashion-retention", name: "Fashion Retention", description: "Retención, loyalty y winback" },
];

export default function FashionDashboard() {
  const [agentId, setAgentId] = useState<AgentId>("fashion-brand-story");
  const [brandName, setBrandName] = useState("");
  const [category, setCategory] = useState<Category>("lifestyle");
  const [targetAudience, setTargetAudience] = useState("");
  const [priceRange, setPriceRange] = useState<PriceRange>("mid-range");
  const [tone, setTone] = useState<Tone>("editorial");
  const [season, setSeason] = useState("atemporal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ agentId: string; result: string; generatedAt: string } | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const active = useMemo(() => AGENTS.find((a) => a.id === agentId) ?? AGENTS[0], [agentId]);

  async function runAgent(): Promise<void> {
    streamAbortRef.current?.abort();
    const controller = new AbortController();
    streamAbortRef.current = controller;

    setLoading(true);
    setError("");
    const generatedAt = new Date().toISOString();
    setResult({ agentId, result: "", generatedAt });

    const input = { brandName, category, targetAudience, priceRange, tone, season: season || undefined };

    try {
      let streamed = "";
      await streamAgentChat({
        serviceId: agentId,
        clientId: brandName.trim() || "fashion-client",
        clientContext: input,
        messages: [
          {
            role: "system",
            content: `Eres ${active.name}, agente NELVYON de moda. ${active.description}. Responde en español con markdown claro.`,
          },
          {
            role: "user",
            content: `Genera el deliverable para este brief:\n${JSON.stringify(input, null, 2)}`,
          },
        ],
        signal: controller.signal,
        onChunk: (delta) => {
          streamed += delta;
          setResult({ agentId, result: streamed, generatedAt });
        },
      });
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        return;
      }
      setError(err instanceof Error ? err.message : "Error inesperado");
      setResult(null);
    } finally {
      setLoading(false);
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
      }
    }
  }

  async function copyResult(): Promise<void> {
    if (!result?.result) return;
    await navigator.clipboard.writeText(result.result);
  }

  return (
    <div className="min-h-[560px] rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-xl">
      <h2 className="mb-1 text-xl font-semibold text-white">Fashion - Lote 17</h2>
      <p className="mb-4 text-sm text-slate-400">10 agentes para moda, belleza y lifestyle.</p>
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
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Brand name" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                <option value="moda-mujer">moda-mujer</option><option value="moda-hombre">moda-hombre</option><option value="moda-infantil">moda-infantil</option><option value="belleza">belleza</option><option value="cosmética">cosmética</option><option value="skincare">skincare</option><option value="joyería">joyería</option><option value="calzado">calzado</option><option value="lifestyle">lifestyle</option>
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Target audience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={priceRange} onChange={(e) => setPriceRange(e.target.value as PriceRange)}>
                <option value="mass-market">mass-market</option><option value="mid-range">mid-range</option><option value="premium">premium</option><option value="luxury">luxury</option>
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="editorial">editorial</option><option value="cercano">cercano</option><option value="aspiracional">aspiracional</option><option value="sostenible">sostenible</option><option value="divertido">divertido</option>
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Season (SS25/AW25/atemporal)" value={season} onChange={(e) => setSeason(e.target.value)} />
            </div>
            <button type="button" disabled={loading} onClick={() => runAgent().catch(() => setError("Error"))} className="mt-4 rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Generando en vivo…" : "Ejecutar agente (stream)"}</button>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-200">Resultado</p>
              <div className="flex items-center gap-2">
                <AgentListenButton text={result?.result ?? ""} disabled={loading || !result?.result} />
                <button type="button" onClick={() => copyResult().catch(() => {})} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200" disabled={!result?.result}>Copiar</button>
              </div>
            </div>
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
              {loading && !result?.result ? "Escribiendo…" : result?.result ? result.result : "Sin resultado todavia."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

