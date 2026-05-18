"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "health-clinic-profile"
  | "health-patient-email"
  | "health-content-marketing"
  | "health-seo-local"
  | "health-ads"
  | "health-review-strategy"
  | "health-referral"
  | "health-crisis-comms"
  | "health-appointment-nurturing"
  | "health-patient-retention";
type Specialty = "medicina-general" | "odontología" | "psicología" | "fisioterapia" | "dermatología" | "oftalmología" | "nutrición" | "ginecología" | "pediatría" | "otro";
type Tone = "profesional" | "cercano" | "empático" | "técnico";

const AGENTS: Array<{ id: AgentId; name: string; description: string }> = [
  { id: "health-clinic-profile", name: "Health Clinic Profile", description: "Perfil integral de clínica/profesional" },
  { id: "health-patient-email", name: "Health Patient Email", description: "Secuencias email para pacientes" },
  { id: "health-content-marketing", name: "Health Content Marketing", description: "Contenido médico de autoridad" },
  { id: "health-seo-local", name: "Health SEO Local", description: "SEO local sanitario" },
  { id: "health-ads", name: "Health Ads", description: "Campañas paid compliant" },
  { id: "health-review-strategy", name: "Health Review Strategy", description: "Sistema de reseñas y reputación" },
  { id: "health-referral", name: "Health Referral", description: "Referidos de pacientes y partners" },
  { id: "health-crisis-comms", name: "Health Crisis Comms", description: "Comunicación de crisis sanitaria" },
  { id: "health-appointment-nurturing", name: "Health Appointment Nurturing", description: "Nurturing para convertir consultas" },
  { id: "health-patient-retention", name: "Health Patient Retention", description: "Retención y fidelización de pacientes" },
];

export default function HealthDashboard() {
  const [agentId, setAgentId] = useState<AgentId>("health-clinic-profile");
  const [clinicName, setClinicName] = useState("");
  const [specialty, setSpecialty] = useState<Specialty>("otro");
  const [targetPatient, setTargetPatient] = useState("");
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
      const response = await fetch("/api/os/agents/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ agentId, input: { clinicName, specialty, targetPatient, tone, location: location || undefined } }),
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
      <h2 className="mb-1 text-xl font-semibold text-white">Health - Lote 19</h2>
      <p className="mb-4 text-sm text-slate-400">10 agentes para clínicas y centros de salud.</p>
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
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Clinic name" value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={specialty} onChange={(e) => setSpecialty(e.target.value as Specialty)}>
                <option value="medicina-general">medicina-general</option><option value="odontología">odontología</option><option value="psicología">psicología</option><option value="fisioterapia">fisioterapia</option><option value="dermatología">dermatología</option><option value="oftalmología">oftalmología</option><option value="nutrición">nutrición</option><option value="ginecología">ginecología</option><option value="pediatría">pediatría</option><option value="otro">otro</option>
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Target patient" value={targetPatient} onChange={(e) => setTargetPatient(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="profesional">profesional</option><option value="cercano">cercano</option><option value="empático">empático</option><option value="técnico">técnico</option>
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

