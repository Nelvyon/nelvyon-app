"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "wellness-business-profile"
  | "wellness-social-media"
  | "wellness-membership-email"
  | "wellness-lead-generation"
  | "wellness-content-marketing"
  | "wellness-retention"
  | "wellness-personal-training"
  | "wellness-ads"
  | "wellness-corporate-wellness"
  | "wellness-review-system";
type ServiceType =
  | "gimnasio"
  | "yoga-pilates"
  | "entrenador-personal"
  | "spa"
  | "nutrición"
  | "meditación"
  | "crossfit"
  | "natación"
  | "otro";
type Tone = "motivador" | "cercano" | "profesional" | "inspiracional";
type Specialization =
  | "pérdida-peso"
  | "musculación"
  | "rehabilitación"
  | "bienestar-mental"
  | "rendimiento-deportivo"
  | "";

const AGENTS: Array<{ id: AgentId; name: string; description: string }> = [
  { id: "wellness-business-profile", name: "Wellness Business Profile", description: "Perfil, valores y directorios" },
  { id: "wellness-social-media", name: "Wellness Social Media", description: "30 ideas, Reels y calendario" },
  { id: "wellness-membership-email", name: "Wellness Membership Email", description: "Onboarding y renovación" },
  { id: "wellness-lead-generation", name: "Wellness Lead Generation", description: "Prueba gratis y retos" },
  { id: "wellness-content-marketing", name: "Wellness Content Marketing", description: "Blog, guías y Pinterest" },
  { id: "wellness-retention", name: "Wellness Retention", description: "Hitos, puntos y eventos" },
  { id: "wellness-personal-training", name: "Wellness Personal Training", description: "PT, paquetes y upsell" },
  { id: "wellness-ads", name: "Wellness Ads", description: "Google/Meta estacional" },
  { id: "wellness-corporate-wellness", name: "Wellness Corporate", description: "B2B RRHH y deck" },
  { id: "wellness-review-system", name: "Wellness Review System", description: "Reseñas y respuestas" },
];

export default function WellnessDashboard() {
  const [agentId, setAgentId] = useState<AgentId>("wellness-business-profile");
  const [businessName, setBusinessName] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("otro");
  const [targetClient, setTargetClient] = useState("");
  const [tone, setTone] = useState<Tone>("profesional");
  const [specialization, setSpecialization] = useState<Specialization>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ agentId: string; result: string; generatedAt: string } | null>(null);
  const active = useMemo(() => AGENTS.find((a) => a.id === agentId) ?? AGENTS[0], [agentId]);

  async function runAgent(): Promise<void> {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/os/agents/wellness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agentId,
          input: {
            businessName,
            serviceType,
            targetClient,
            tone,
            ...(specialization !== "" ? { specialization } : {}),
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
      <h2 className="mb-1 text-xl font-semibold text-white">Wellness - Lote 24</h2>
      <p className="mb-4 text-sm text-slate-400">10 agentes para fitness, yoga, spa y nutrición.</p>
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
                <option value="gimnasio">gimnasio</option>
                <option value="yoga-pilates">yoga-pilates</option>
                <option value="entrenador-personal">entrenador-personal</option>
                <option value="spa">spa</option>
                <option value="nutrición">nutrición</option>
                <option value="meditación">meditación</option>
                <option value="crossfit">crossfit</option>
                <option value="natación">natación</option>
                <option value="otro">otro</option>
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Target client" value={targetClient} onChange={(e) => setTargetClient(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="motivador">motivador</option>
                <option value="cercano">cercano</option>
                <option value="profesional">profesional</option>
                <option value="inspiracional">inspiracional</option>
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={specialization} onChange={(e) => setSpecialization(e.target.value as Specialization)}>
                <option value="">Especialización (opcional)</option>
                <option value="pérdida-peso">pérdida-peso</option>
                <option value="musculación">musculación</option>
                <option value="rehabilitación">rehabilitación</option>
                <option value="bienestar-mental">bienestar-mental</option>
                <option value="rendimiento-deportivo">rendimiento-deportivo</option>
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
