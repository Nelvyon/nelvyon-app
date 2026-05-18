"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "logistics-company-profile"
  | "logistics-b2b-lead-gen"
  | "logistics-ecommerce"
  | "logistics-content-marketing"
  | "logistics-seo"
  | "logistics-retention"
  | "logistics-ads"
  | "logistics-review-system";
type ServiceType =
  | "transporte-nacional"
  | "transporte-internacional"
  | "última-milla"
  | "fulfillment"
  | "mudanzas"
  | "almacenaje"
  | "mensajería"
  | "otro";
type Tone = "profesional" | "técnico" | "cercano" | "comercial";
type CoverageOpt = "" | "local" | "nacional" | "europeo" | "internacional";

const AGENTS: Array<{ id: AgentId; name: string; description: string }> = [
  { id: "logistics-company-profile", name: "Perfil empresa", description: "Quiénes somos, flota, certificaciones y directorios." },
  { id: "logistics-b2b-lead-gen", name: "Leads B2B", description: "Outreach, deck, LinkedIn, landing tarifa y licitaciones." },
  { id: "logistics-ecommerce", name: "Ecommerce & fulfillment", description: "Propuesta tiendas online, comparativas y lead magnet." },
  { id: "logistics-content-marketing", name: "Contenidos", description: "LinkedIn/blog, newsletters y guías descargables." },
  { id: "logistics-seo", name: "SEO", description: "Keywords, meta, schema, reseñas y directorios del sector." },
  { id: "logistics-retention", name: "Retención", description: "Informes SLA, programa volumen y upsells de servicio." },
  { id: "logistics-ads", name: "Paid media", description: "Search B2B, LinkedIn, retargeting tarifa y Display." },
  { id: "logistics-review-system", name: "Reseñas", description: "Solicitudes post-servicio, plantillas y Trustpilot." },
];

export default function LogisticsDashboard() {
  const [agentId, setAgentId] = useState<AgentId>("logistics-company-profile");
  const [businessName, setBusinessName] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("otro");
  const [targetClient, setTargetClient] = useState("");
  const [tone, setTone] = useState<Tone>("profesional");
  const [coverage, setCoverage] = useState<CoverageOpt>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ agentId: string; result: string; generatedAt: string } | null>(null);
  const active = useMemo(() => AGENTS.find((a) => a.id === agentId) ?? AGENTS[0], [agentId]);

  async function runAgent(): Promise<void> {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/os/agents/logistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agentId,
          input: { businessName, serviceType, targetClient, tone, ...(coverage ? { coverage } : {}) },
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
      <h2 className="mb-1 text-xl font-semibold text-white">Logística &amp; transporte — Lote 30</h2>
      <p className="mb-4 text-sm text-slate-400">8 agentes para transporte, mensajería, mudanzas y distribución.</p>
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-2">
          {AGENTS.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => setAgentId(agent.id)}
              className={`w-full rounded-lg border p-3 text-left ${agent.id === agentId ? "border-amber-500/50 bg-amber-950/30" : "border-slate-800 bg-slate-900/50"}`}
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
                <option value="transporte-nacional">transporte-nacional</option>
                <option value="transporte-internacional">transporte-internacional</option>
                <option value="última-milla">última-milla</option>
                <option value="fulfillment">fulfillment</option>
                <option value="mudanzas">mudanzas</option>
                <option value="almacenaje">almacenaje</option>
                <option value="mensajería">mensajería</option>
                <option value="otro">otro</option>
              </select>
              <input
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                placeholder="Cliente objetivo (ej. retail industrial ecommerce)"
                value={targetClient}
                onChange={(e) => setTargetClient(e.target.value)}
              />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="profesional">profesional</option>
                <option value="técnico">técnico</option>
                <option value="cercano">cercano</option>
                <option value="comercial">comercial</option>
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={coverage} onChange={(e) => setCoverage(e.target.value as CoverageOpt)}>
                <option value="">Cobertura (opcional)</option>
                <option value="local">local</option>
                <option value="nacional">nacional</option>
                <option value="europeo">europeo</option>
                <option value="internacional">internacional</option>
              </select>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => runAgent().catch(() => setError("Error"))}
              className="mt-4 rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
