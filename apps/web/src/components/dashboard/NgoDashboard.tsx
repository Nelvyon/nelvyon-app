"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "ngo-organization-profile"
  | "ngo-donation-campaign"
  | "ngo-social-media"
  | "ngo-volunteer-recruitment"
  | "ngo-grant-writing"
  | "ngo-corporate-partnership"
  | "ngo-email-campaign"
  | "ngo-transparency-report";
type Cause =
  | "infancia"
  | "medioambiente"
  | "pobreza"
  | "salud"
  | "educación"
  | "derechos-humanos"
  | "animales"
  | "discapacidad"
  | "otro";
type Tone = "emocional" | "profesional" | "cercano" | "inspiracional";
type Country = "" | "ES" | "LATAM" | "internacional";

const AGENTS: Array<{ id: AgentId; name: string; description: string }> = [
  { id: "ngo-organization-profile", name: "Ngo Organization Profile", description: "Misión, impacto y directorios" },
  { id: "ngo-donation-campaign", name: "Ngo Donation Campaign", description: "Cartas, landing y matching" },
  { id: "ngo-social-media", name: "Ngo Social Media", description: "Contenido y ética RRSS" },
  { id: "ngo-volunteer-recruitment", name: "Ngo Volunteer Recruitment", description: "Captación voluntariado pro-bono" },
  { id: "ngo-grant-writing", name: "Ngo Grant Writing", description: "Propuestas y convocatorias" },
  { id: "ngo-corporate-partnership", name: "Ngo Corporate Partnership", description: "RSC y empresas" },
  { id: "ngo-email-campaign", name: "Ngo Email Campaign", description: "Donantes, socios y newsletters" },
  { id: "ngo-transparency-report", name: "Ngo Transparency Report", description: "Memoria y rendición de cuentas" },
];

export default function NgoDashboard() {
  const [agentId, setAgentId] = useState<AgentId>("ngo-organization-profile");
  const [organizationName, setOrganizationName] = useState("");
  const [cause, setCause] = useState<Cause>("otro");
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState<Tone>("profesional");
  const [country, setCountry] = useState<Country>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ agentId: string; result: string; generatedAt: string } | null>(null);
  const active = useMemo(() => AGENTS.find((a) => a.id === agentId) ?? AGENTS[0], [agentId]);

  async function runAgent(): Promise<void> {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/os/agents/ngo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agentId,
          input: {
            organizationName,
            cause,
            targetAudience,
            tone,
            ...(country !== "" ? { country } : {}),
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
      <h2 className="mb-1 text-xl font-semibold text-white">NGO &amp; Sector social - Lote 27</h2>
      <p className="mb-4 text-sm text-slate-400">8 agentes para fundaciones y tercer sector.</p>
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
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Organization name" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={cause} onChange={(e) => setCause(e.target.value as Cause)}>
                <option value="infancia">infancia</option>
                <option value="medioambiente">medioambiente</option>
                <option value="pobreza">pobreza</option>
                <option value="salud">salud</option>
                <option value="educación">educación</option>
                <option value="derechos-humanos">derechos-humanos</option>
                <option value="animales">animales</option>
                <option value="discapacidad">discapacidad</option>
                <option value="otro">otro</option>
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Target audience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="emocional">emocional</option>
                <option value="profesional">profesional</option>
                <option value="cercano">cercano</option>
                <option value="inspiracional">inspiracional</option>
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={country} onChange={(e) => setCountry(e.target.value as Country)}>
                <option value="">País / área (opcional)</option>
                <option value="ES">ES</option>
                <option value="LATAM">LATAM</option>
                <option value="internacional">internacional</option>
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
