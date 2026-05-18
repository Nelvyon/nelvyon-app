"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "auto-business-profile"
  | "auto-vehicle-description"
  | "auto-local-seo"
  | "auto-ads"
  | "auto-email-campaign"
  | "auto-review-system"
  | "auto-content-strategy"
  | "auto-referral"
  | "auto-seasonal-campaign";
type BusinessType = "concesionario" | "taller" | "compraventa" | "rent-a-car" | "accesorios" | "otro";
type Tone = "profesional" | "cercano" | "técnico" | "comercial";

const AGENTS: Array<{ id: AgentId; name: string; description: string }> = [
  { id: "auto-business-profile", name: "Auto Business Profile", description: "Perfil, GMB y portales" },
  { id: "auto-vehicle-description", name: "Auto Vehicle Description", description: "Fichas de venta con storytelling" },
  { id: "auto-local-seo", name: "Auto Local SEO", description: "Keywords y schema automoción" },
  { id: "auto-ads", name: "Auto Ads", description: "Search, Meta y retargeting" },
  { id: "auto-email-campaign", name: "Auto Email Campaign", description: "ITV, post-venta, newsletter" },
  { id: "auto-review-system", name: "Auto Review System", description: "Reseñas y gestión conflictos" },
  { id: "auto-content-strategy", name: "Auto Content Strategy", description: "RRSS, blog y YouTube" },
  { id: "auto-referral", name: "Auto Referral", description: "Referidos y flotas" },
  { id: "auto-seasonal-campaign", name: "Auto Seasonal Campaign", description: "Calendario promocional" },
];

export default function AutomotiveDashboard() {
  const [agentId, setAgentId] = useState<AgentId>("auto-business-profile");
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
      const response = await fetch("/api/os/agents/automotive", {
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
      <h2 className="mb-1 text-xl font-semibold text-white">Automotive - Lote 23</h2>
      <p className="mb-4 text-sm text-slate-400">9 agentes para concesionarios, talleres y movilidad.</p>
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
                <option value="concesionario">concesionario</option>
                <option value="taller">taller</option>
                <option value="compraventa">compraventa</option>
                <option value="rent-a-car">rent-a-car</option>
                <option value="accesorios">accesorios</option>
                <option value="otro">otro</option>
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Target client" value={targetClient} onChange={(e) => setTargetClient(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="profesional">profesional</option>
                <option value="cercano">cercano</option>
                <option value="técnico">técnico</option>
                <option value="comercial">comercial</option>
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
