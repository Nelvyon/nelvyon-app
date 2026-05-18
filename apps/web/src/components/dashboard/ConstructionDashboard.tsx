"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "build-company-profile"
  | "build-project-description"
  | "build-lead-generation"
  | "build-content-marketing"
  | "build-budget-conversion"
  | "build-seo-local"
  | "build-ads"
  | "build-review-system"
  | "build-referral-network";
type ServiceType = "constructora" | "arquitectura" | "reformas" | "diseño-interior" | "instalaciones" | "ingeniería" | "otro";
type Tone = "profesional" | "cercano" | "técnico" | "aspiracional";

const AGENTS: Array<{ id: AgentId; name: string; description: string }> = [
  { id: "build-company-profile", name: "Perfil empresa", description: "Quienes somos, credenciales, GMB y portales del sector." },
  { id: "build-project-description", name: "Ficha proyecto", description: "Portfolio narrativo, specs en beneficios y CTAs multi-canal." },
  { id: "build-lead-generation", name: "Captación leads", description: "Landing, Google/Meta, Habitissimo y canal inmobiliaria." },
  { id: "build-content-marketing", name: "Contenidos", description: "Redes, blog, vídeo timelapse, newsletter y Pinterest." },
  { id: "build-budget-conversion", name: "Presupuesto a cierre", description: "Emails, seguimiento, objeciones y plantilla contrato." },
  { id: "build-seo-local", name: "SEO local", description: "Keywords por ciudad, GMB, schema y reseñas." },
  { id: "build-ads", name: "Paid media", description: "Search, Meta, retargeting, Display y LinkedIn B2B." },
  { id: "build-review-system", name: "Reseñas", description: "Solicitud post-obra, guías cliente y gestión reputación." },
  { id: "build-referral-network", name: "Red referidos", description: "Partners arquitecto/constructora, inmobiliarias y proveedores." },
];

export default function ConstructionDashboard() {
  const [agentId, setAgentId] = useState<AgentId>("build-company-profile");
  const [businessName, setBusinessName] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("otro");
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
      const response = await fetch("/api/os/agents/construction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agentId,
          input: { businessName, serviceType, targetClient, tone, location: location || undefined },
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
      <h2 className="mb-1 text-xl font-semibold text-white">Construcción &amp; arquitectura — Lote 29</h2>
      <p className="mb-4 text-sm text-slate-400">9 agentes para constructoras, estudios de arquitectura, reformas e instaladores.</p>
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-2">
          {AGENTS.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => setAgentId(agent.id)}
              className={`w-full rounded-lg border p-3 text-left ${agent.id === agentId ? "border-emerald-500/50 bg-emerald-950/30" : "border-slate-800 bg-slate-900/50"}`}
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
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nombre del negocio" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={serviceType} onChange={(e) => setServiceType(e.target.value as ServiceType)}>
                <option value="constructora">constructora</option>
                <option value="arquitectura">arquitectura</option>
                <option value="reformas">reformas</option>
                <option value="diseño-interior">diseño-interior</option>
                <option value="instalaciones">instalaciones</option>
                <option value="ingeniería">ingeniería</option>
                <option value="otro">otro</option>
              </select>
              <input
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                placeholder="Cliente objetivo (ej. propietarios, promotores)"
                value={targetClient}
                onChange={(e) => setTargetClient(e.target.value)}
              />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="profesional">profesional</option>
                <option value="cercano">cercano</option>
                <option value="técnico">técnico</option>
                <option value="aspiracional">aspiracional</option>
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Ubicación (opcional)" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => runAgent().catch(() => setError("Error"))}
              className="mt-4 rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
