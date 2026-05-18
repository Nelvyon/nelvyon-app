"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "property-description" | "property-photo-prompt" | "buyer-persona" | "property-video-script" | "openhouse-email"
  | "mortgage-content" | "neighborhood-guide" | "lead-nurturing-realestate" | "social-proof" | "market-report";
type Field = { key: string; label: string; type: "text" | "textarea" | "number" };
type AgentCard = { id: AgentId; icon: string; name: string; desc: string; fields: Field[] };

const AGENTS: AgentCard[] = [
  { id: "property-description", icon: "🏠", name: "Property Description", desc: "Copy irresistible para portales.", fields: [{ key: "propertyType", label: "Tipo inmueble", type: "text" }, { key: "location", label: "Ubicación", type: "text" }, { key: "features", label: "Features (coma)", type: "text" }, { key: "targetBuyer", label: "Comprador objetivo", type: "text" }] },
  { id: "property-photo-prompt", icon: "🖼️", name: "Property Photo Prompt", desc: "Prompt + imagen de portada.", fields: [{ key: "propertyType", label: "Tipo inmueble", type: "text" }, { key: "style", label: "Estilo visual", type: "text" }, { key: "keySellingPoints", label: "Puntos clave (coma)", type: "text" }] },
  { id: "buyer-persona", icon: "👤", name: "Buyer Persona", desc: "Perfil comprador ideal.", fields: [{ key: "propertyType", label: "Tipo inmueble", type: "text" }, { key: "area", label: "Zona", type: "text" }, { key: "priceRange", label: "Rango precio", type: "text" }] },
  { id: "property-video-script", icon: "🎬", name: "Property Video Script", desc: "Script video + reels.", fields: [{ key: "propertyType", label: "Tipo inmueble", type: "text" }, { key: "location", label: "Ubicación", type: "text" }, { key: "highlights", label: "Highlights (coma)", type: "text" }] },
  { id: "openhouse-email", icon: "📧", name: "Open House Email", desc: "Campaña puertas abiertas.", fields: [{ key: "propertyType", label: "Tipo inmueble", type: "text" }, { key: "dateTime", label: "Fecha/hora", type: "text" }, { key: "audienceSegment", label: "Segmento", type: "text" }] },
  { id: "mortgage-content", icon: "🏦", name: "Mortgage Content", desc: "Contenido educativo hipotecas.", fields: [{ key: "buyerStage", label: "Etapa comprador", type: "text" }, { key: "financingContext", label: "Contexto financiero", type: "text" }, { key: "countryOrRegion", label: "País/región", type: "text" }] },
  { id: "neighborhood-guide", icon: "🗺️", name: "Neighborhood Guide", desc: "Guía del barrio.", fields: [{ key: "neighborhood", label: "Barrio", type: "text" }, { key: "city", label: "Ciudad", type: "text" }, { key: "propertyType", label: "Tipo inmueble", type: "text" }] },
  { id: "lead-nurturing-realestate", icon: "📬", name: "Lead Nurturing", desc: "Secuencia para leads fríos.", fields: [{ key: "leadSegment", label: "Segmento lead", type: "text" }, { key: "propertyFocus", label: "Foco propiedades", type: "text" }, { key: "urgencyLevel", label: "Urgencia", type: "text" }] },
  { id: "social-proof", icon: "🏆", name: "Social Proof", desc: "Testimonios y casos de éxito.", fields: [{ key: "caseType", label: "Tipo caso", type: "text" }, { key: "propertyType", label: "Tipo inmueble", type: "text" }, { key: "outcome", label: "Resultado", type: "text" }] },
  { id: "market-report", icon: "📊", name: "Market Report", desc: "Informe mercado local.", fields: [{ key: "city", label: "Ciudad", type: "text" }, { key: "zones", label: "Zonas (coma)", type: "text" }, { key: "propertyType", label: "Tipo inmueble", type: "text" }, { key: "period", label: "Periodo", type: "text" }] },
];

export default function RealEstateDashboard() {
  const [selected, setSelected] = useState<AgentId>("property-description");
  const [form, setForm] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const active = useMemo(() => AGENTS.find((a) => a.id === selected) ?? AGENTS[0], [selected]);
  const updateField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const parseInput = () => {
    const out: Record<string, unknown> = {};
    for (const f of active.fields) {
      const raw = (form[f.key] ?? "").trim();
      if (!raw) continue;
      if (f.type === "number") out[f.key] = Number(raw);
      else if (["features", "keySellingPoints", "highlights", "zones"].includes(f.key)) out[f.key] = raw.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
      else out[f.key] = raw;
    }
    return out;
  };
  async function runAgent(): Promise<void> {
    setStatus(""); setLoading(true);
    try {
      const res = await fetch("/api/os/agents/realestate", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ agentId: selected, input: parseInput() }) });
      const data = (await res.json()) as { result?: unknown; error?: string };
      if (!res.ok) { setStatus(data.error ?? "Error"); return; }
      setResult(data.result ?? null); setStatus("Resultado generado");
    } finally { setLoading(false); }
  }
  const imageUrl = typeof result === "object" && result && "imageUrl" in (result as Record<string, unknown>) ? String((result as Record<string, unknown>).imageUrl ?? "") : "";

  return (
    <div className="min-h-[560px] rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-xl">
      <h2 className="mb-1 text-xl font-semibold text-white">Inmobiliarias — Lote 13</h2>
      <p className="mb-4 text-sm text-slate-400">10 agentes para marketing inmobiliario y nurturing de leads.</p>
      {status ? <p className="mb-3 text-sm text-amber-400">{status}</p> : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-2">
          {AGENTS.map((a) => (
            <button key={a.id} type="button" onClick={() => setSelected(a.id)} className={`w-full rounded-lg border p-3 text-left ${selected === a.id ? "border-sky-500/50 bg-sky-950/30" : "border-slate-800 bg-slate-900/50"}`}>
              <p className="text-sm font-medium text-white">{a.icon} {a.name}</p>
              <p className="mt-1 text-xs text-slate-400">{a.desc}</p>
            </button>
          ))}
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <p className="mb-3 text-sm font-medium text-slate-200">{active.icon} {active.name}</p>
            <div className="grid gap-3">
              {active.fields.map((f) => f.type === "textarea"
                ? <textarea key={f.key} className="min-h-[90px] rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder={f.label} value={form[f.key] ?? ""} onChange={(e) => updateField(f.key, e.target.value)} />
                : <input key={f.key} className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" type={f.type === "number" ? "number" : "text"} placeholder={f.label} value={form[f.key] ?? ""} onChange={(e) => updateField(f.key, e.target.value)} />)}
            </div>
            <button type="button" disabled={loading} onClick={() => runAgent().catch(() => setStatus("Error"))} className="mt-4 rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Ejecutando..." : "Ejecutar agente"}</button>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <p className="mb-2 text-sm font-medium text-slate-200">Resultado</p>
            {imageUrl ? <img src={imageUrl} alt="property image" className="mb-3 w-full rounded border border-slate-700" /> : null}
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">{result ? JSON.stringify(result, null, 2) : "Sin resultado todavía."}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

