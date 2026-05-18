"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "agro-product-description"
  | "agro-brand-story"
  | "agro-b2b-outreach"
  | "agro-digital-marketing"
  | "agro-export"
  | "agro-sustainability-content"
  | "agro-seasonal-campaign"
  | "agro-retail-presence";
type ProductType =
  | "vino"
  | "aceite-oliva"
  | "frutas-verduras"
  | "carne"
  | "lácteos"
  | "conservas"
  | "bebidas"
  | "panadería-pastelería"
  | "otro";
type TargetMarket = "b2c-directo" | "supermercados" | "restauración" | "exportación" | "gourmet";
type Tone = "artesanal" | "premium" | "sostenible" | "tradicional" | "moderno";

const AGENTS: Array<{ id: AgentId; name: string; description: string }> = [
  { id: "agro-product-description", name: "Descripción producto", description: "Sensorial, territorio, certificaciones y copy multi-canal." },
  { id: "agro-brand-story", name: "Historia de marca", description: "Manifiesto, taglines y voz por canal." },
  { id: "agro-b2b-outreach", name: "Outreach B2B", description: "Retail, distribución, LinkedIn y ferias." },
  { id: "agro-digital-marketing", name: "Marketing digital", description: "D2C, redes, email, tienda y Meta gourmet." },
  { id: "agro-export", name: "Exportación", description: "Mercados, deck EN, ferias y certificaciones." },
  { id: "agro-sustainability-content", name: "Sostenibilidad", description: "Informes, storytelling y anti-greenwashing." },
  { id: "agro-seasonal-campaign", name: "Campañas estacionales", description: "Cosecha, Navidad, verano y tradiciones." },
  { id: "agro-retail-presence", name: "Retail & PLV", description: "Lineal, central de compras y delicatessen." },
];

export default function AgrofoodDashboard() {
  const [agentId, setAgentId] = useState<AgentId>("agro-product-description");
  const [businessName, setBusinessName] = useState("");
  const [productType, setProductType] = useState<ProductType>("vino");
  const [targetMarket, setTargetMarket] = useState<TargetMarket>("b2c-directo");
  const [tone, setTone] = useState<Tone>("artesanal");
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ agentId: string; result: string; generatedAt: string } | null>(null);
  const active = useMemo(() => AGENTS.find((a) => a.id === agentId) ?? AGENTS[0], [agentId]);

  async function runAgent(): Promise<void> {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/os/agents/agrofood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agentId,
          input: { businessName, productType, targetMarket, tone, origin: origin || undefined },
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
      <h2 className="mb-1 text-xl font-semibold text-white">Agroalimentario — Lote 32</h2>
      <p className="mb-4 text-sm text-slate-400">8 agentes para productores, bodegas, cooperativas y marcas gastro.</p>
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-2">
          {AGENTS.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => setAgentId(agent.id)}
              className={`w-full rounded-lg border p-3 text-left ${agent.id === agentId ? "border-lime-500/50 bg-lime-950/25" : "border-slate-800 bg-slate-900/50"}`}
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
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nombre del negocio / marca" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={productType} onChange={(e) => setProductType(e.target.value as ProductType)}>
                <option value="vino">vino</option>
                <option value="aceite-oliva">aceite-oliva</option>
                <option value="frutas-verduras">frutas-verduras</option>
                <option value="carne">carne</option>
                <option value="lácteos">lácteos</option>
                <option value="conservas">conservas</option>
                <option value="bebidas">bebidas</option>
                <option value="panadería-pastelería">panadería-pastelería</option>
                <option value="otro">otro</option>
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={targetMarket} onChange={(e) => setTargetMarket(e.target.value as TargetMarket)}>
                <option value="b2c-directo">b2c-directo</option>
                <option value="supermercados">supermercados</option>
                <option value="restauración">restauración</option>
                <option value="exportación">exportación</option>
                <option value="gourmet">gourmet</option>
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="artesanal">artesanal</option>
                <option value="premium">premium</option>
                <option value="sostenible">sostenible</option>
                <option value="tradicional">tradicional</option>
                <option value="moderno">moderno</option>
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Región o DO (opcional)" value={origin} onChange={(e) => setOrigin(e.target.value)} />
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => runAgent().catch(() => setError("Error"))}
              className="mt-4 rounded bg-lime-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
