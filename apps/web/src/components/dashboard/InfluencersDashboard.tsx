"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "content-calendar" | "caption-writer" | "hashtag-strategy" | "story-script" | "reel-idea" | "brand-deal-negotiator"
  | "audience-analysis" | "competitor-analysis" | "viral-hook" | "bio-optimizer" | "collab-pitch" | "monetization-plan";
type Field = { key: string; label: string; type: "text" | "textarea" | "number" };
type AgentCard = { id: AgentId; icon: string; name: string; desc: string; fields: Field[] };

const AGENTS: AgentCard[] = [
  { id: "content-calendar", icon: "🗓️", name: "Content Calendar", desc: "Calendario mensual multiplataforma.", fields: [{ key: "niche", label: "Nicho", type: "text" }, { key: "goals", label: "Objetivos", type: "textarea" }, { key: "platforms", label: "Plataformas (coma)", type: "text" }] },
  { id: "caption-writer", icon: "✍️", name: "Caption Writer", desc: "Captions virales.", fields: [{ key: "platform", label: "Plataforma", type: "text" }, { key: "topic", label: "Tema", type: "text" }, { key: "tone", label: "Tono", type: "text" }] },
  { id: "hashtag-strategy", icon: "#️⃣", name: "Hashtag Strategy", desc: "Hashtags por bucket.", fields: [{ key: "niche", label: "Nicho", type: "text" }, { key: "platform", label: "Plataforma", type: "text" }, { key: "postTopic", label: "Tema post", type: "text" }] },
  { id: "story-script", icon: "🎬", name: "Story Script", desc: "Script hook-valor-CTA.", fields: [{ key: "topic", label: "Tema", type: "text" }, { key: "platform", label: "Plataforma", type: "text" }, { key: "goal", label: "Objetivo", type: "text" }] },
  { id: "reel-idea", icon: "📱", name: "Reel Idea", desc: "10 ideas Reels/TikTok.", fields: [{ key: "niche", label: "Nicho", type: "text" }, { key: "audience", label: "Audiencia", type: "text" }] },
  { id: "brand-deal-negotiator", icon: "💼", name: "Brand Deal Negotiator", desc: "Tarifa + propuesta + email.", fields: [{ key: "followers", label: "Followers", type: "number" }, { key: "avgViews", label: "Views promedio", type: "number" }, { key: "engagementRate", label: "ER %", type: "number" }, { key: "niche", label: "Nicho", type: "text" }, { key: "brand", label: "Marca", type: "text" }] },
  { id: "audience-analysis", icon: "👥", name: "Audience Analysis", desc: "Insights de audiencia.", fields: [{ key: "demographics", label: "Demografía", type: "textarea" }, { key: "interests", label: "Intereses", type: "textarea" }, { key: "behavior", label: "Comportamiento", type: "textarea" }] },
  { id: "competitor-analysis", icon: "🕵️", name: "Competitor Analysis", desc: "Gaps y diferenciación.", fields: [{ key: "niche", label: "Nicho", type: "text" }, { key: "platform", label: "Plataforma", type: "text" }, { key: "competitors", label: "Competidores (coma)", type: "text" }] },
  { id: "viral-hook", icon: "⚡", name: "Viral Hook", desc: "15 hooks de retención.", fields: [{ key: "niche", label: "Nicho", type: "text" }, { key: "contentType", label: "Tipo de contenido", type: "text" }, { key: "audience", label: "Audiencia", type: "text" }] },
  { id: "bio-optimizer", icon: "🧬", name: "Bio Optimizer", desc: "Bio de conversión.", fields: [{ key: "platform", label: "Plataforma", type: "text" }, { key: "currentBio", label: "Bio actual", type: "textarea" }, { key: "niche", label: "Nicho", type: "text" }, { key: "offer", label: "Oferta", type: "text" }] },
  { id: "collab-pitch", icon: "🤝", name: "Collab Pitch", desc: "Pitch de colaboración.", fields: [{ key: "yourProfile", label: "Tu perfil", type: "textarea" }, { key: "targetInfluencer", label: "Influencer objetivo", type: "text" }, { key: "collabGoal", label: "Meta collab", type: "text" }] },
  { id: "monetization-plan", icon: "💸", name: "Monetization Plan", desc: "Plan completo de ingresos.", fields: [{ key: "niche", label: "Nicho", type: "text" }, { key: "audienceSize", label: "Tamaño audiencia", type: "number" }, { key: "strengths", label: "Fortalezas", type: "textarea" }] },
];

export default function InfluencersDashboard() {
  const [selected, setSelected] = useState<AgentId>("content-calendar");
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
      else if (f.key === "platforms" || f.key === "competitors") out[f.key] = raw.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
      else out[f.key] = raw;
    }
    return out;
  };
  async function runAgent(): Promise<void> {
    setStatus(""); setLoading(true);
    try {
      const res = await fetch("/api/os/agents/influencers", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ agentId: selected, input: parseInput() }) });
      const data = (await res.json()) as { result?: unknown; error?: string };
      if (!res.ok) { setStatus(data.error ?? "Error"); return; }
      setResult(data.result ?? null); setStatus("Resultado generado");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-[560px] rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-xl">
      <h2 className="mb-1 text-xl font-semibold text-white">Influencers — Lote 8</h2>
      <p className="mb-4 text-sm text-slate-400">12 agentes para estrategia de contenido, marcas y monetización.</p>
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
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">{result ? JSON.stringify(result, null, 2) : "Sin resultado todavía."}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

