"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "personal-branding"
  | "linkedin-optimization"
  | "portfolio-description"
  | "rate-justification"
  | "client-proposal"
  | "testimonial-request"
  | "niche-content"
  | "referral-system"
  | "freelancer-email-sequence";
type Tone = "profesional" | "cercano" | "tecnico" | "inspiracional";

const AGENTS: Array<{ id: AgentId; name: string; description: string; icon: string }> = [
  { id: "personal-branding", name: "Personal Branding", description: "Propuesta de valor y bios", icon: "PB" },
  { id: "linkedin-optimization", name: "LinkedIn Optimization", description: "Perfil y contenido autoridad", icon: "LI" },
  { id: "portfolio-description", name: "Portfolio Description", description: "Casos de exito STAR", icon: "PF" },
  { id: "rate-justification", name: "Rate Justification", description: "Argumentario premium de precio", icon: "RJ" },
  { id: "client-proposal", name: "Client Proposal", description: "Propuesta comercial completa", icon: "CP" },
  { id: "testimonial-request", name: "Testimonial Request", description: "Mensajes para testimonios", icon: "TR" },
  { id: "niche-content", name: "Niche Content", description: "Contenido de autoridad", icon: "NC" },
  { id: "referral-system", name: "Referral System", description: "Sistema de referidos", icon: "RS" },
  { id: "freelancer-email-sequence", name: "Email Sequence", description: "Nurturing de 5 emails", icon: "ES" },
];

export default function FreelancersDashboard() {
  const [agentId, setAgentId] = useState<AgentId>("personal-branding");
  const [professionalName, setProfessionalName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [targetClient, setTargetClient] = useState("");
  const [tone, setTone] = useState<Tone>("profesional");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ agentId: string; result: string; generatedAt: string } | null>(null);

  const active = useMemo(() => AGENTS.find((a) => a.id === agentId) ?? AGENTS[0], [agentId]);

  async function submit(): Promise<void> {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/os/agents/freelancers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agentId,
          input: { professionalName, specialty, targetClient, tone, location: location || undefined },
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
      <h2 className="mb-1 text-xl font-semibold text-white">Freelancers - Lote 14</h2>
      <p className="mb-4 text-sm text-slate-400">9 agentes para profesionales independientes.</p>
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-2">
          {AGENTS.map((agent) => (
            <button key={agent.id} type="button" onClick={() => setAgentId(agent.id)} className={`w-full rounded-lg border p-3 text-left ${agent.id === agentId ? "border-sky-500/50 bg-sky-950/30" : "border-slate-800 bg-slate-900/50"}`}>
              <p className="text-sm font-medium text-white">{agent.icon} {agent.name}</p>
              <p className="mt-1 text-xs text-slate-400">{agent.description}</p>
            </button>
          ))}
        </div>
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <p className="mb-3 text-sm font-medium text-slate-200">{active.icon} {active.name}</p>
            <div className="grid gap-3">
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nombre profesional" value={professionalName} onChange={(e) => setProfessionalName(e.target.value)} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Especialidad" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Cliente objetivo" value={targetClient} onChange={(e) => setTargetClient(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="profesional">profesional</option>
                <option value="cercano">cercano</option>
                <option value="tecnico">tecnico</option>
                <option value="inspiracional">inspiracional</option>
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Ubicacion (opcional)" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <button type="button" disabled={loading} onClick={() => submit().catch(() => setError("Error"))} className="mt-4 rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {loading ? "Generando..." : "Ejecutar agente"}
            </button>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-200">Resultado</p>
              <button type="button" onClick={() => copyResult().catch(() => {})} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200" disabled={!result?.result}>Copiar</button>
            </div>
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
              {result?.result ? result.result : "Sin resultado todavia."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

