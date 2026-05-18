"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "home-business-profile"
  | "home-local-seo"
  | "home-lead-generation"
  | "home-review-system"
  | "home-before-after-content"
  | "home-urgency-ads"
  | "home-client-retention"
  | "home-budget-email"
  | "home-seasonal-campaign";
type ServiceType = "fontanería" | "electricidad" | "reformas" | "limpieza" | "jardinería" | "cerrajería" | "pintura" | "mudanzas" | "instalaciones" | "otro";
type Tone = "profesional" | "cercano" | "urgente" | "confiable";
type Urgency = "24h" | "mismo-día" | "programado" | "";

const AGENTS: Array<{ id: AgentId; name: string; description: string }> = [
  { id: "home-business-profile", name: "Home Business Profile", description: "Perfil, GMB y Quiénes somos" },
  { id: "home-local-seo", name: "Home Local SEO", description: "Keywords, schema y directorios" },
  { id: "home-lead-generation", name: "Home Lead Generation", description: "Landing, ads y referidos" },
  { id: "home-review-system", name: "Home Review System", description: "Reseñas Google y respuestas" },
  { id: "home-before-after-content", name: "Home Before/After Content", description: "RRSS y portfolio WhatsApp" },
  { id: "home-urgency-ads", name: "Home Urgency Ads", description: "Search urgencias y estacional" },
  { id: "home-client-retention", name: "Home Client Retention", description: "Mantenimiento y fidelización" },
  { id: "home-budget-email", name: "Home Budget Email", description: "Seguimiento de presupuestos" },
  { id: "home-seasonal-campaign", name: "Home Seasonal Campaign", description: "Calendario promocional anual" },
];

export default function HomeDashboard() {
  const [agentId, setAgentId] = useState<AgentId>("home-business-profile");
  const [businessName, setBusinessName] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("otro");
  const [targetArea, setTargetArea] = useState("");
  const [tone, setTone] = useState<Tone>("profesional");
  const [urgency, setUrgency] = useState<Urgency>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ agentId: string; result: string; generatedAt: string } | null>(null);
  const active = useMemo(() => AGENTS.find((a) => a.id === agentId) ?? AGENTS[0], [agentId]);

  async function runAgent(): Promise<void> {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/os/agents/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agentId,
          input: {
            businessName,
            serviceType,
            targetArea,
            tone,
            ...(urgency ? { urgency } : {}),
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
      <h2 className="mb-1 text-xl font-semibold text-white">Home - Lote 21</h2>
      <p className="mb-4 text-sm text-slate-400">9 agentes para servicios del hogar y reformas.</p>
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
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={serviceType} onChange={(e) => setServiceType(e.target.value as ServiceType)}>
                <option value="fontanería">fontanería</option>
                <option value="electricidad">electricidad</option>
                <option value="reformas">reformas</option>
                <option value="limpieza">limpieza</option>
                <option value="jardinería">jardinería</option>
                <option value="cerrajería">cerrajería</option>
                <option value="pintura">pintura</option>
                <option value="mudanzas">mudanzas</option>
                <option value="instalaciones">instalaciones</option>
                <option value="otro">otro</option>
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Target area (city/zona)" value={targetArea} onChange={(e) => setTargetArea(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="profesional">profesional</option>
                <option value="cercano">cercano</option>
                <option value="urgente">urgente</option>
                <option value="confiable">confiable</option>
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={urgency} onChange={(e) => setUrgency(e.target.value as Urgency)}>
                <option value="">Urgencia (opcional)</option>
                <option value="24h">24h</option>
                <option value="mismo-día">mismo-día</option>
                <option value="programado">programado</option>
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
