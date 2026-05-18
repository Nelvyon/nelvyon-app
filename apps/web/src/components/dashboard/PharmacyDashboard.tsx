"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "pharmacy-profile"
  | "pharmacy-content-marketing"
  | "pharmacy-local-seo"
  | "pharmacy-seasonal-campaign"
  | "pharmacy-email-campaign"
  | "pharmacy-whatsapp-strategy"
  | "pharmacy-loyalty-program"
  | "pharmacy-review-system";
type BusinessType = "farmacia" | "parafarmacia" | "herbolario" | "óptica" | "ortopedia" | "otro";
type Tone = "profesional" | "cercano" | "educativo" | "confiable";

const AGENTS: Array<{ id: AgentId; name: string; description: string }> = [
  { id: "pharmacy-profile", name: "Pharmacy Profile", description: "Perfil, GMB y directorios" },
  { id: "pharmacy-content-marketing", name: "Pharmacy Content Marketing", description: "Blog, RRSS y newsletter AEMPS" },
  { id: "pharmacy-local-seo", name: "Pharmacy Local SEO", description: "Keywords, GMB y schema Pharmacy" },
  { id: "pharmacy-seasonal-campaign", name: "Pharmacy Seasonal Campaign", description: "Campañas estacionales multi-canal" },
  { id: "pharmacy-email-campaign", name: "Pharmacy Email Campaign", description: "Fidelización y adherencia" },
  { id: "pharmacy-whatsapp-strategy", name: "Pharmacy WhatsApp Strategy", description: "WA Business y plantillas" },
  { id: "pharmacy-loyalty-program", name: "Pharmacy Loyalty Program", description: "Puntos y niveles cliente" },
  { id: "pharmacy-review-system", name: "Pharmacy Review System", description: "Reseñas Google sin datos de salud" },
];

export default function PharmacyDashboard() {
  const [agentId, setAgentId] = useState<AgentId>("pharmacy-profile");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("otro");
  const [targetClient, setTargetClient] = useState("");
  const [tone, setTone] = useState<Tone>("profesional");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ agentId: string; result: string; generatedAt: string } | null>(null);
  const active = useMemo(() => AGENTS.find((a) => a.id === agentId) ?? AGENTS[0], [agentId]);

  async function runAgent(): Promise<void> {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/os/agents/pharmacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ agentId, input: { businessName, businessType, targetClient, tone, location: location || undefined } }),
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
      <h2 className="mb-1 text-xl font-semibold text-white">Pharmacy - Lote 25</h2>
      <p className="mb-4 text-sm text-slate-400">8 agentes para farmacia y parafarmacia compliant.</p>
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
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={businessType} onChange={(e) => setBusinessType(e.target.value as BusinessType)}>
                <option value="farmacia">farmacia</option>
                <option value="parafarmacia">parafarmacia</option>
                <option value="herbolario">herbolario</option>
                <option value="óptica">óptica</option>
                <option value="ortopedia">ortopedia</option>
                <option value="otro">otro</option>
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Target client" value={targetClient} onChange={(e) => setTargetClient(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="profesional">profesional</option>
                <option value="cercano">cercano</option>
                <option value="educativo">educativo</option>
                <option value="confiable">confiable</option>
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
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
