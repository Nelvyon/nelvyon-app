"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "athlete-personal-brand" | "match-day-content" | "sponsorship-deck" | "esports-highlight" | "fan-engagement"
  | "transfer-news" | "merchandising" | "training-content" | "club-community" | "performance-report";
type Field = { key: string; label: string; type: "text" | "textarea" | "number" };
type AgentCard = { id: AgentId; icon: string; name: string; desc: string; fields: Field[] };

const AGENTS: AgentCard[] = [
  { id: "athlete-personal-brand", icon: "🏅", name: "Athlete Personal Brand", desc: "Marca personal del atleta.", fields: [{ key: "athleteName", label: "Nombre atleta", type: "text" }, { key: "sport", label: "Deporte", type: "text" }, { key: "goals", label: "Objetivos", type: "textarea" }] },
  { id: "match-day-content", icon: "⚽", name: "Match Day Content", desc: "Contenido pre/live/post partido.", fields: [{ key: "teamOrAthlete", label: "Equipo/atleta", type: "text" }, { key: "opponent", label: "Rival", type: "text" }, { key: "platformSet", label: "Plataformas (coma)", type: "text" }] },
  { id: "sponsorship-deck", icon: "📈", name: "Sponsorship Deck", desc: "Deck de patrocinio profesional.", fields: [{ key: "entity", label: "Entidad", type: "text" }, { key: "audienceReach", label: "Alcance", type: "text" }, { key: "metrics", label: "Métricas", type: "textarea" }, { key: "brandFit", label: "Brand fit", type: "text" }] },
  { id: "esports-highlight", icon: "🎮", name: "Esports Highlight", desc: "Highlights y clips virales.", fields: [{ key: "game", label: "Juego", type: "text" }, { key: "team", label: "Equipo", type: "text" }, { key: "keyMoments", label: "Momentos clave", type: "textarea" }] },
  { id: "fan-engagement", icon: "🔥", name: "Fan Engagement", desc: "Campañas de comunidad.", fields: [{ key: "entity", label: "Entidad", type: "text" }, { key: "sportType", label: "Tipo deporte", type: "text" }, { key: "currentCommunityState", label: "Estado comunidad", type: "textarea" }] },
  { id: "transfer-news", icon: "📰", name: "Transfer News", desc: "Comunicados de fichajes.", fields: [{ key: "team", label: "Equipo", type: "text" }, { key: "playerOrStaff", label: "Jugador/staff", type: "text" }, { key: "eventType", label: "Evento (transfer/renewal/departure)", type: "text" }, { key: "context", label: "Contexto", type: "textarea" }] },
  { id: "merchandising", icon: "🛍️", name: "Merchandising", desc: "Productos y campañas.", fields: [{ key: "entity", label: "Entidad", type: "text" }, { key: "audienceType", label: "Tipo audiencia", type: "text" }, { key: "seasonOrMoment", label: "Temporada/momento", type: "text" }] },
  { id: "training-content", icon: "🏋️", name: "Training Content", desc: "Contenido educativo deportivo.", fields: [{ key: "athleteOrCoach", label: "Atleta/coach", type: "text" }, { key: "discipline", label: "Disciplina", type: "text" }, { key: "audienceLevel", label: "Nivel audiencia", type: "text" }] },
  { id: "club-community", icon: "🏟️", name: "Club Community", desc: "Comunidad de club.", fields: [{ key: "clubName", label: "Club", type: "text" }, { key: "seasonGoal", label: "Objetivo temporada", type: "text" }, { key: "memberSegments", label: "Segmentos socios", type: "textarea" }] },
  { id: "performance-report", icon: "📊", name: "Performance Report", desc: "Informe mensual digital.", fields: [{ key: "entity", label: "Entidad", type: "text" }, { key: "month", label: "Mes", type: "text" }, { key: "metricsSummary", label: "Resumen métricas", type: "textarea" }, { key: "sponsorshipsActive", label: "Patrocinios activos", type: "text" }] },
];

export default function SportsDashboard() {
  const [selected, setSelected] = useState<AgentId>("athlete-personal-brand");
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
      else if (f.key === "platformSet") out[f.key] = raw.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
      else out[f.key] = raw;
    }
    return out;
  };
  async function runAgent(): Promise<void> {
    setStatus(""); setLoading(true);
    try {
      const res = await fetch("/api/os/agents/sports", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ agentId: selected, input: parseInput() }) });
      const data = (await res.json()) as { result?: unknown; error?: string };
      if (!res.ok) { setStatus(data.error ?? "Error"); return; }
      setResult(data.result ?? null); setStatus("Resultado generado");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-[560px] rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-xl">
      <h2 className="mb-1 text-xl font-semibold text-white">Sports/Esports — Lote 9</h2>
      <p className="mb-4 text-sm text-slate-400">10 agentes para atletas, clubes, equipos esports y marcas deportivas.</p>
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

