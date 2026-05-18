"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "b2b-lead-gen" | "linkedin-outreach" | "sales-email-sequence" | "proposal-generator"
  | "case-study" | "competitive-battlecard" | "account-based-marketing" | "demo-script"
  | "rfp-response" | "customer-success-email" | "nurturing-campaign" | "b2b-content-strategy";
type Field = { key: string; label: string; type: "text" | "textarea" | "number" };
type AgentCard = { id: AgentId; icon: string; name: string; desc: string; fields: Field[] };

const AGENTS: AgentCard[] = [
  { id: "b2b-lead-gen", icon: "🎯", name: "B2B Lead Gen", desc: "ICP + lista empresas objetivo.", fields: [{ key: "industry", label: "Industria", type: "text" }, { key: "icp", label: "ICP", type: "textarea" }, { key: "regions", label: "Regiones (coma)", type: "text" }] },
  { id: "linkedin-outreach", icon: "🔗", name: "LinkedIn Outreach", desc: "Secuencias de mensajes.", fields: [{ key: "role", label: "Cargo objetivo", type: "text" }, { key: "sector", label: "Sector", type: "text" }, { key: "offer", label: "Oferta", type: "text" }] },
  { id: "sales-email-sequence", icon: "📧", name: "Sales Email Sequence", desc: "5 emails de venta.", fields: [{ key: "icpRole", label: "Rol ICP", type: "text" }, { key: "industry", label: "Industria", type: "text" }, { key: "offer", label: "Oferta", type: "text" }] },
  { id: "proposal-generator", icon: "📄", name: "Proposal Generator", desc: "Propuesta comercial completa.", fields: [{ key: "clientName", label: "Cliente", type: "text" }, { key: "problem", label: "Problema", type: "textarea" }, { key: "solution", label: "Solución", type: "textarea" }, { key: "budgetRange", label: "Rango presupuesto", type: "text" }] },
  { id: "case-study", icon: "🏆", name: "Case Study", desc: "Caso de éxito estructurado.", fields: [{ key: "clientIndustry", label: "Industria cliente", type: "text" }, { key: "challenge", label: "Challenge", type: "textarea" }, { key: "solution", label: "Solución", type: "textarea" }, { key: "quantifiedResults", label: "Resultados cuantificados", type: "textarea" }] },
  { id: "competitive-battlecard", icon: "⚔️", name: "Competitive Battlecard", desc: "Battlecard contra competidor.", fields: [{ key: "competitor", label: "Competidor", type: "text" }, { key: "yourOffer", label: "Tu oferta", type: "text" }, { key: "targetSegment", label: "Segmento", type: "text" }] },
  { id: "account-based-marketing", icon: "🧭", name: "ABM Campaign", desc: "Campaña ABM por cuenta.", fields: [{ key: "targetAccount", label: "Cuenta objetivo", type: "text" }, { key: "stakeholders", label: "Stakeholders (coma)", type: "text" }, { key: "objective", label: "Objetivo", type: "text" }] },
  { id: "demo-script", icon: "🖥️", name: "Demo Script", desc: "Script de demo con cierre.", fields: [{ key: "product", label: "Producto/servicio", type: "text" }, { key: "buyerRole", label: "Rol comprador", type: "text" }, { key: "painPoints", label: "Pain points (coma)", type: "text" }] },
  { id: "rfp-response", icon: "🧾", name: "RFP Response", desc: "Respuesta profesional RFP.", fields: [{ key: "rfpSummary", label: "Resumen RFP", type: "textarea" }, { key: "differentiators", label: "Diferenciadores (coma)", type: "text" }, { key: "proposedApproach", label: "Approach", type: "textarea" }] },
  { id: "customer-success-email", icon: "🤝", name: "Customer Success Email", desc: "Onboarding + upsell + renovación.", fields: [{ key: "customerType", label: "Tipo cliente", type: "text" }, { key: "onboardingGoal", label: "Objetivo onboarding", type: "text" }, { key: "product", label: "Producto", type: "text" }] },
  { id: "nurturing-campaign", icon: "🌱", name: "Nurturing Campaign", desc: "8 touchpoints progresivos.", fields: [{ key: "audienceSegment", label: "Segmento", type: "text" }, { key: "offer", label: "Oferta", type: "text" }, { key: "valueThemes", label: "Temas valor (coma)", type: "text" }] },
  { id: "b2b-content-strategy", icon: "🗂️", name: "B2B Content Strategy", desc: "Calendario editorial full funnel.", fields: [{ key: "industry", label: "Industria", type: "text" }, { key: "icp", label: "ICP", type: "textarea" }, { key: "funnelStages", label: "Etapas funnel (coma)", type: "text" }] },
];

export default function B2BDashboard() {
  const [selected, setSelected] = useState<AgentId>("b2b-lead-gen");
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
      else if (["regions", "stakeholders", "painPoints", "differentiators", "valueThemes", "funnelStages"].includes(f.key)) out[f.key] = raw.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
      else out[f.key] = raw;
    }
    return out;
  };
  async function runAgent(): Promise<void> {
    setStatus(""); setLoading(true);
    try {
      const res = await fetch("/api/os/agents/b2b", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ agentId: selected, input: parseInput() }) });
      const data = (await res.json()) as { result?: unknown; error?: string };
      if (!res.ok) { setStatus(data.error ?? "Error"); return; }
      setResult(data.result ?? null); setStatus("Resultado generado");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-[560px] rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-xl">
      <h2 className="mb-1 text-xl font-semibold text-white">Empresas B2B — Lote 10</h2>
      <p className="mb-4 text-sm text-slate-400">12 agentes para marketing y ventas B2B end-to-end.</p>
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

