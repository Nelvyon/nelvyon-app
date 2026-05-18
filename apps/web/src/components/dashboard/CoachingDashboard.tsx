"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "coaching-personal-brand"
  | "coaching-launch-email"
  | "coaching-sales-page"
  | "coaching-webinar"
  | "coaching-content-strategy"
  | "coaching-lead-magnet"
  | "coaching-testimonial-system"
  | "coaching-ads"
  | "coaching-community"
  | "coaching-upsell-funnel";
type Niche =
  | "negocios"
  | "marketing"
  | "mindset"
  | "relaciones"
  | "salud-bienestar"
  | "finanzas-personales"
  | "productividad"
  | "liderazgo"
  | "otro";
type Tone = "inspiracional" | "directo" | "cercano" | "autoritativo" | "empático";
type ProductType =
  | "curso-grabado"
  | "programa-grupal"
  | "coaching-1a1"
  | "membresía"
  | "masterclass"
  | "";

const AGENTS: Array<{ id: AgentId; name: string; description: string }> = [
  { id: "coaching-personal-brand", name: "Coaching Personal Brand", description: "PUV, historia y voz de marca" },
  { id: "coaching-launch-email", name: "Coaching Launch Email", description: "Secuencia pre y carrito cierre" },
  { id: "coaching-sales-page", name: "Coaching Sales Page", description: "Long-form venta programa" },
  { id: "coaching-webinar", name: "Coaching Webinar", description: "Guión webinar y seguimiento" },
  { id: "coaching-content-strategy", name: "Coaching Content Strategy", description: "30 ideas y calendario" },
  { id: "coaching-lead-magnet", name: "Coaching Lead Magnet", description: "Imán, masterclass y landings" },
  { id: "coaching-testimonial-system", name: "Coaching Testimonial System", description: "Captación y uso de casos" },
  { id: "coaching-ads", name: "Coaching Ads", description: "Meta lanzamiento compliant" },
  { id: "coaching-community", name: "Coaching Community", description: "Grupo alumnos y alumni" },
  { id: "coaching-upsell-funnel", name: "Coaching Upsell Funnel", description: "Escalera y high ticket" },
];

export default function CoachingDashboard() {
  const [agentId, setAgentId] = useState<AgentId>("coaching-personal-brand");
  const [expertName, setExpertName] = useState("");
  const [niche, setNiche] = useState<Niche>("otro");
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState<Tone>("inspiracional");
  const [productType, setProductType] = useState<ProductType>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ agentId: string; result: string; generatedAt: string } | null>(null);
  const active = useMemo(() => AGENTS.find((a) => a.id === agentId) ?? AGENTS[0], [agentId]);

  async function runAgent(): Promise<void> {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/os/agents/coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agentId,
          input: {
            expertName,
            niche,
            targetAudience,
            tone,
            ...(productType !== "" ? { productType } : {}),
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
      <h2 className="mb-1 text-xl font-semibold text-white">Coaching - Lote 26</h2>
      <p className="mb-4 text-sm text-slate-400">10 agentes para infoproductos, coaches y formadores.</p>
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
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Expert name" value={expertName} onChange={(e) => setExpertName(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={niche} onChange={(e) => setNiche(e.target.value as Niche)}>
                <option value="negocios">negocios</option>
                <option value="marketing">marketing</option>
                <option value="mindset">mindset</option>
                <option value="relaciones">relaciones</option>
                <option value="salud-bienestar">salud-bienestar</option>
                <option value="finanzas-personales">finanzas-personales</option>
                <option value="productividad">productividad</option>
                <option value="liderazgo">liderazgo</option>
                <option value="otro">otro</option>
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Target audience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="inspiracional">inspiracional</option>
                <option value="directo">directo</option>
                <option value="cercano">cercano</option>
                <option value="autoritativo">autoritativo</option>
                <option value="empático">empático</option>
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={productType} onChange={(e) => setProductType(e.target.value as ProductType)}>
                <option value="">Tipo de producto (opcional)</option>
                <option value="curso-grabado">curso-grabado</option>
                <option value="programa-grupal">programa-grupal</option>
                <option value="coaching-1a1">coaching-1a1</option>
                <option value="membresía">membresía</option>
                <option value="masterclass">masterclass</option>
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
