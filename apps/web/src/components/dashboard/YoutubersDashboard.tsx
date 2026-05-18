"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "idea-generator"
  | "script-writer"
  | "thumbnail-prompt"
  | "title-optimizer"
  | "description-seo"
  | "chapters"
  | "community-post"
  | "shorts-adapter"
  | "monetization-advisor"
  | "analytics-interpreter"
  | "collab-finder"
  | "sponsorship-email"
  | "video-seo-audit";

type Field = { key: string; label: string; type: "text" | "textarea" | "number" };
type AgentCard = { id: AgentId; icon: string; name: string; desc: string; fields: Field[] };

const AGENTS: AgentCard[] = [
  { id: "idea-generator", icon: "💡", name: "Idea Generator", desc: "10 ideas virales con SEO.", fields: [{ key: "niche", label: "Nicho", type: "text" }, { key: "channelContext", label: "Contexto del canal", type: "textarea" }, { key: "targetAudience", label: "Audiencia objetivo", type: "text" }] },
  { id: "script-writer", icon: "📝", name: "Script Writer", desc: "Guión completo de video.", fields: [{ key: "title", label: "Título", type: "text" }, { key: "idea", label: "Idea base", type: "textarea" }, { key: "channelStyle", label: "Estilo del canal", type: "text" }, { key: "targetMinutes", label: "Minutos objetivo", type: "number" }] },
  { id: "thumbnail-prompt", icon: "🖼️", name: "Thumbnail Prompt", desc: "Prompt + imagen CTR.", fields: [{ key: "title", label: "Título", type: "text" }, { key: "niche", label: "Nicho", type: "text" }, { key: "vibe", label: "Vibe visual", type: "text" }] },
  { id: "title-optimizer", icon: "🎯", name: "Title Optimizer", desc: "5 títulos con score.", fields: [{ key: "baseTitle", label: "Título base", type: "text" }, { key: "niche", label: "Nicho", type: "text" }, { key: "audience", label: "Audiencia", type: "text" }] },
  { id: "description-seo", icon: "🔎", name: "Description SEO", desc: "Descripción SEO completa.", fields: [{ key: "title", label: "Título", type: "text" }, { key: "transcriptSummary", label: "Resumen", type: "textarea" }, { key: "links", label: "Links (coma separada)", type: "textarea" }] },
  { id: "chapters", icon: "⏱️", name: "Chapters", desc: "Timestamps optimizados.", fields: [{ key: "script", label: "Guion", type: "textarea" }, { key: "targetMinutes", label: "Minutos objetivo", type: "number" }] },
  { id: "community-post", icon: "💬", name: "Community Post", desc: "Posts para comunidad.", fields: [{ key: "topic", label: "Tema", type: "text" }, { key: "objective", label: "Objetivo (engagement/awareness/conversion)", type: "text" }] },
  { id: "shorts-adapter", icon: "📱", name: "Shorts Adapter", desc: "3 ideas de Shorts.", fields: [{ key: "longVideoTopic", label: "Tema video largo", type: "text" }, { key: "transcriptOrScript", label: "Transcripción/guion", type: "textarea" }] },
  { id: "monetization-advisor", icon: "💰", name: "Monetization Advisor", desc: "Estrategias e ingresos.", fields: [{ key: "niche", label: "Nicho", type: "text" }, { key: "subscribers", label: "Suscriptores", type: "number" }, { key: "viewsPerMonth", label: "Views por mes", type: "number" }, { key: "rpm", label: "RPM", type: "number" }] },
  { id: "analytics-interpreter", icon: "📊", name: "Analytics Interpreter", desc: "Recomendaciones priorizadas.", fields: [{ key: "ctr", label: "CTR %", type: "number" }, { key: "retention", label: "Retención %", type: "number" }, { key: "rpm", label: "RPM", type: "number" }, { key: "subscribersDelta", label: "Delta suscriptores", type: "number" }, { key: "context", label: "Contexto", type: "text" }] },
  { id: "collab-finder", icon: "🤝", name: "Collab Finder", desc: "Colaboradores ideales.", fields: [{ key: "niche", label: "Nicho", type: "text" }, { key: "channelSize", label: "Tamaño canal", type: "text" }, { key: "audienceProfile", label: "Perfil audiencia", type: "textarea" }] },
  { id: "sponsorship-email", icon: "✉️", name: "Sponsorship Email", desc: "Outreach a marcas.", fields: [{ key: "brandName", label: "Marca", type: "text" }, { key: "niche", label: "Nicho", type: "text" }, { key: "channelMetrics", label: "Métricas canal", type: "textarea" }] },
  { id: "video-seo-audit", icon: "🧪", name: "Video SEO Audit", desc: "Auditoría y mejoras SEO.", fields: [{ key: "title", label: "Título", type: "text" }, { key: "description", label: "Descripción", type: "textarea" }, { key: "tags", label: "Tags (coma separada)", type: "text" }, { key: "transcriptSummary", label: "Resumen", type: "textarea" }] },
];

export default function YoutubersDashboard() {
  const [selected, setSelected] = useState<AgentId>("idea-generator");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const active = useMemo(() => AGENTS.find((a) => a.id === selected) ?? AGENTS[0], [selected]);

  function updateField(key: string, value: string): void { setForm((prev) => ({ ...prev, [key]: value })); }

  function parseInput(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const f of active.fields) {
      const raw = (form[f.key] ?? "").trim();
      if (!raw) continue;
      if (f.type === "number") out[f.key] = Number(raw);
      else if (f.key === "links" || f.key === "tags") out[f.key] = raw.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
      else out[f.key] = raw;
    }
    return out;
  }

  async function runAgent(): Promise<void> {
    setStatus("");
    setLoading(true);
    try {
      const res = await fetch("/api/os/agents/youtubers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ agentId: selected, input: parseInput() }),
      });
      const data = (await res.json()) as { result?: unknown; error?: string };
      if (!res.ok) {
        setStatus(data.error ?? "Error ejecutando agente");
        return;
      }
      setResult(data.result ?? null);
      setStatus("Resultado generado");
    } finally {
      setLoading(false);
    }
  }

  const imageUrl = typeof result === "object" && result && "imageUrl" in (result as Record<string, unknown>) ? String((result as Record<string, unknown>).imageUrl ?? "") : "";

  return (
    <div className="min-h-[560px] rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-xl">
      <h2 className="mb-1 text-xl font-semibold text-white">Youtubers Avanzado — Lote 7</h2>
      <p className="mb-4 text-sm text-slate-400">13 agentes especializados para operar el canal end-to-end.</p>
      {status ? <p className="mb-3 text-sm text-amber-400">{status}</p> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-1">
          {AGENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(a.id)}
              className={`w-full rounded-lg border p-3 text-left transition ${selected === a.id ? "border-sky-500/50 bg-sky-950/30" : "border-slate-800 bg-slate-900/50 hover:border-slate-700"}`}
            >
              <p className="text-sm font-medium text-white">{a.icon} {a.name}</p>
              <p className="mt-1 text-xs text-slate-400">{a.desc}</p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <p className="mb-3 text-sm font-medium text-slate-200">{active.icon} {active.name}</p>
            <div className="grid gap-3">
              {active.fields.map((f) =>
                f.type === "textarea" ? (
                  <textarea key={f.key} className="min-h-[90px] rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder={f.label} value={form[f.key] ?? ""} onChange={(e) => updateField(f.key, e.target.value)} />
                ) : (
                  <input key={f.key} className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" type={f.type === "number" ? "number" : "text"} placeholder={f.label} value={form[f.key] ?? ""} onChange={(e) => updateField(f.key, e.target.value)} />
                ),
              )}
            </div>
            <button type="button" disabled={loading} onClick={() => runAgent().catch(() => setStatus("Error"))} className="mt-4 rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50">
              {loading ? "Ejecutando..." : "Ejecutar agente"}
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <p className="mb-2 text-sm font-medium text-slate-200">Resultado</p>
            {imageUrl ? <img src={imageUrl} alt="thumbnail" className="mb-3 w-full rounded border border-slate-700" /> : null}
            <pre className="max-h-[380px] overflow-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
              {result ? JSON.stringify(result, null, 2) : "Sin resultado todavía."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
