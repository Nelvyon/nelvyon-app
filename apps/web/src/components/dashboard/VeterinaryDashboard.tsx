"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "vet-clinic-profile"
  | "vet-content-marketing"
  | "vet-local-seo"
  | "vet-appointment-nurturing"
  | "vet-seasonal-campaign"
  | "vet-review-system"
  | "vet-loyalty-program"
  | "vet-pet-shop-content";
type ServiceType =
  | "clínica-veterinaria"
  | "peluquería-canina"
  | "tienda-mascotas"
  | "adiestramiento"
  | "guardería-canina"
  | "otro";
type TargetPet = "perros" | "gatos" | "exóticos" | "todas";
type Tone = "empático" | "profesional" | "cercano" | "educativo";

const AGENTS: Array<{ id: AgentId; name: string; description: string }> = [
  { id: "vet-clinic-profile", name: "Vet Clinic Profile", description: "Perfil, equipo y directorios" },
  { id: "vet-content-marketing", name: "Vet Content Marketing", description: "Blog, FAQ y newsletters" },
  { id: "vet-local-seo", name: "Vet Local SEO", description: "GMB, schema y reseñas" },
  { id: "vet-appointment-nurturing", name: "Vet Appointment Nurturing", description: "Convertir consultas en citas" },
  { id: "vet-seasonal-campaign", name: "Vet Seasonal Campaign", description: "Campañas por estación" },
  { id: "vet-review-system", name: "Vet Review System", description: "Reseñas y situaciones delicadas" },
  { id: "vet-loyalty-program", name: "Vet Loyalty Program", description: "Plan preventivo y referidos" },
  { id: "vet-pet-shop-content", name: "Vet Pet Shop Content", description: "Tienda, UGC y upsell" },
];

export default function VeterinaryDashboard() {
  const [agentId, setAgentId] = useState<AgentId>("vet-clinic-profile");
  const [businessName, setBusinessName] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("otro");
  const [targetPet, setTargetPet] = useState<TargetPet>("todas");
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
      const response = await fetch("/api/os/agents/veterinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ agentId, input: { businessName, serviceType, targetPet, tone, location: location || undefined } }),
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
      <h2 className="mb-1 text-xl font-semibold text-white">Veterinary &amp; Mascotas - Lote 28</h2>
      <p className="mb-4 text-sm text-slate-400">8 agentes para clínicas, tiendas y servicios pet-friendly.</p>
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
                <option value="clínica-veterinaria">clínica-veterinaria</option>
                <option value="peluquería-canina">peluquería-canina</option>
                <option value="tienda-mascotas">tienda-mascotas</option>
                <option value="adiestramiento">adiestramiento</option>
                <option value="guardería-canina">guardería-canina</option>
                <option value="otro">otro</option>
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={targetPet} onChange={(e) => setTargetPet(e.target.value as TargetPet)}>
                <option value="perros">perros</option>
                <option value="gatos">gatos</option>
                <option value="exóticos">exóticos</option>
                <option value="todas">todas</option>
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="empático">empático</option>
                <option value="profesional">profesional</option>
                <option value="cercano">cercano</option>
                <option value="educativo">educativo</option>
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
