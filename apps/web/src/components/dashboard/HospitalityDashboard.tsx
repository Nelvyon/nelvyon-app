"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "menu-copywriter" | "google-my-business" | "reservation-campaign" | "review-response" | "social-menu"
  | "event-promotion" | "delivery-optimization" | "loyalty-program" | "influencer-food" | "seasonal-menu";
type Field = { key: string; label: string; type: "text" | "textarea" | "number" };
type AgentCard = { id: AgentId; icon: string; name: string; desc: string; fields: Field[] };

const AGENTS: AgentCard[] = [
  { id: "menu-copywriter", icon: "🍽️", name: "Menu Copywriter", desc: "Descripciones irresistibles de platos.", fields: [{ key: "venueType", label: "Tipo local", type: "text" }, { key: "cuisine", label: "Cocina", type: "text" }, { key: "dishes", label: "Platos (coma)", type: "text" }] },
  { id: "google-my-business", icon: "📍", name: "Google My Business", desc: "Optimización ficha GMB completa.", fields: [{ key: "businessName", label: "Negocio", type: "text" }, { key: "category", label: "Categoría", type: "text" }, { key: "city", label: "Ciudad", type: "text" }, { key: "positioning", label: "Posicionamiento", type: "text" }] },
  { id: "reservation-campaign", icon: "📅", name: "Reservation Campaign", desc: "Campañas para subir reservas.", fields: [{ key: "businessType", label: "Tipo negocio", type: "text" }, { key: "lowDemandSlots", label: "Horas flojas (coma)", type: "text" }, { key: "audience", label: "Audiencia", type: "text" }] },
  { id: "review-response", icon: "⭐", name: "Review Response", desc: "Respuestas profesionales reseñas.", fields: [{ key: "platform", label: "Plataforma", type: "text" }, { key: "rating", label: "Rating", type: "number" }, { key: "reviewText", label: "Texto reseña", type: "textarea" }, { key: "brandTone", label: "Tono marca", type: "text" }] },
  { id: "social-menu", icon: "📸", name: "Social Menu", desc: "Contenido social del menú + imagen.", fields: [{ key: "menuTheme", label: "Tema menú", type: "text" }, { key: "season", label: "Temporada", type: "text" }, { key: "platform", label: "Plataforma", type: "text" }] },
  { id: "event-promotion", icon: "🎉", name: "Event Promotion", desc: "Campañas para eventos especiales.", fields: [{ key: "eventType", label: "Tipo evento", type: "text" }, { key: "venue", label: "Local", type: "text" }, { key: "targetAudience", label: "Audiencia", type: "text" }, { key: "dateWindow", label: "Ventana fechas", type: "text" }] },
  { id: "delivery-optimization", icon: "🛵", name: "Delivery Optimization", desc: "Optimización apps delivery.", fields: [{ key: "appMix", label: "Apps (coma)", type: "text" }, { key: "topProducts", label: "Top productos (coma)", type: "text" }, { key: "currentIssue", label: "Problema actual", type: "text" }] },
  { id: "loyalty-program", icon: "💳", name: "Loyalty Program", desc: "Programa fidelización.", fields: [{ key: "venueType", label: "Tipo local", type: "text" }, { key: "avgTicket", label: "Ticket medio", type: "number" }, { key: "returnGoal", label: "Objetivo retorno", type: "text" }] },
  { id: "influencer-food", icon: "🤳", name: "Influencer Food", desc: "Outreach influencers gastronómicos.", fields: [{ key: "city", label: "Ciudad", type: "text" }, { key: "cuisineType", label: "Tipo cocina", type: "text" }, { key: "campaignGoal", label: "Objetivo campaña", type: "text" }] },
  { id: "seasonal-menu", icon: "🍷", name: "Seasonal Menu", desc: "Lanzamiento menú de temporada.", fields: [{ key: "season", label: "Temporada", type: "text" }, { key: "menuTheme", label: "Tema menú", type: "text" }, { key: "audienceSegment", label: "Segmento audiencia", type: "text" }] },
];

export default function HospitalityDashboard() {
  const [selected, setSelected] = useState<AgentId>("menu-copywriter");
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
      else if (["dishes", "lowDemandSlots", "appMix", "topProducts"].includes(f.key)) out[f.key] = raw.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
      else out[f.key] = raw;
    }
    return out;
  };
  async function runAgent(): Promise<void> {
    setStatus(""); setLoading(true);
    try {
      const res = await fetch("/api/os/agents/hospitality", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ agentId: selected, input: parseInput() }) });
      const data = (await res.json()) as { result?: unknown; error?: string };
      if (!res.ok) { setStatus(data.error ?? "Error"); return; }
      setResult(data.result ?? null); setStatus("Resultado generado");
    } finally { setLoading(false); }
  }
  const imageUrl = typeof result === "object" && result && "imageUrl" in (result as Record<string, unknown>) ? String((result as Record<string, unknown>).imageUrl ?? "") : "";

  return (
    <div className="min-h-[560px] rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-xl">
      <h2 className="mb-1 text-xl font-semibold text-white">Restaurantes/Hostelería — Lote 12</h2>
      <p className="mb-4 text-sm text-slate-400">10 agentes para reservas, reputación y marketing hostelero.</p>
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
            {imageUrl ? <img src={imageUrl} alt="menu social" className="mb-3 w-full rounded border border-slate-700" /> : null}
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">{result ? JSON.stringify(result, null, 2) : "Sin resultado todavía."}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

