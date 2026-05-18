"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "tourism-business-profile"
  | "tourism-listing-optimization"
  | "tourism-content-marketing"
  | "tourism-seo"
  | "tourism-email-campaign"
  | "tourism-social-media"
  | "tourism-review-management"
  | "tourism-direct-booking"
  | "tourism-package-description"
  | "tourism-seasonal-campaign";
type BusinessType = "hotel" | "apartamento-turístico" | "agencia-viajes" | "guía-tours" | "actividades" | "glamping" | "hostal" | "otro";
type TargetTraveler = "familias" | "parejas" | "aventura" | "lujo" | "mochilero" | "negocios" | "grupos";
type Tone = "inspiracional" | "cercano" | "exclusivo" | "aventurero";

const AGENTS: Array<{ id: AgentId; name: string; description: string }> = [
  { id: "tourism-business-profile", name: "Perfil negocio", description: "Historia, propuesta de valor y fichas OTA/web." },
  { id: "tourism-listing-optimization", name: "Listings OTA", description: "Títulos, descripción, FAQs, fotos y precios." },
  { id: "tourism-content-marketing", name: "Contenidos", description: "Blog, newsletter, vídeo y Pinterest inspiración." },
  { id: "tourism-seo", name: "SEO turismo", description: "Keywords, schema, reseñas y comparadores." },
  { id: "tourism-email-campaign", name: "Email marketing", description: "Confirmación, pre-llegada, post-estancia y nurturing." },
  { id: "tourism-social-media", name: "Redes sociales", description: "IG, TikTok, UGC calendario e influencers." },
  { id: "tourism-review-management", name: "Reseñas", description: "Solicitud, respuestas y ranking TripAdvisor." },
  { id: "tourism-direct-booking", name: "Reserva directa", description: "Argumentario, perks y estrategia frente a OTAs." },
  { id: "tourism-package-description", name: "Paquetes", description: "Storytelling, itinerario inclusión y CTA." },
  { id: "tourism-seasonal-campaign", name: "Campañas estacionales", description: "Verano, fiestas, románticas y temporada baja." },
];

export default function TourismDashboard() {
  const [agentId, setAgentId] = useState<AgentId>("tourism-business-profile");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("hotel");
  const [targetTraveler, setTargetTraveler] = useState<TargetTraveler>("familias");
  const [tone, setTone] = useState<Tone>("inspiracional");
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
      const response = await fetch("/api/os/agents/tourism", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agentId,
          input: { businessName, businessType, targetTraveler, tone, location: location || undefined },
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
      <h2 className="mb-1 text-xl font-semibold text-white">Turismo &amp; viajes — Lote 31</h2>
      <p className="mb-4 text-sm text-slate-400">10 agentes para alojamiento, experiencias y agencias de viajes.</p>
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
          {AGENTS.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => setAgentId(agent.id)}
              className={`w-full rounded-lg border p-3 text-left ${agent.id === agentId ? "border-sky-500/50 bg-sky-950/30" : "border-slate-800 bg-slate-900/50"}`}
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
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={businessType} onChange={(e) => setBusinessType(e.target.value as BusinessType)}>
                <option value="hotel">hotel</option>
                <option value="apartamento-turístico">apartamento-turístico</option>
                <option value="agencia-viajes">agencia-viajes</option>
                <option value="guía-tours">guía-tours</option>
                <option value="actividades">actividades</option>
                <option value="glamping">glamping</option>
                <option value="hostal">hostal</option>
                <option value="otro">otro</option>
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={targetTraveler} onChange={(e) => setTargetTraveler(e.target.value as TargetTraveler)}>
                <option value="familias">familias</option>
                <option value="parejas">parejas</option>
                <option value="aventura">aventura</option>
                <option value="lujo">lujo</option>
                <option value="mochilero">mochilero</option>
                <option value="negocios">negocios</option>
                <option value="grupos">grupos</option>
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="inspiracional">inspiracional</option>
                <option value="cercano">cercano</option>
                <option value="exclusivo">exclusivo</option>
                <option value="aventurero">aventurero</option>
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Ubicación / destino (opcional)" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => runAgent().catch(() => setError("Error"))}
              className="mt-4 rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
