"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "finance-company-profile"
  | "finance-content-marketing"
  | "finance-seo"
  | "finance-lead-generation"
  | "finance-email-nurturing"
  | "finance-trust-building"
  | "finance-regulatory-content"
  | "finance-referral"
  | "finance-retention"
  | "finance-thought-leadership";
type ServiceType =
  | "asesoría-financiera"
  | "seguros"
  | "hipotecas"
  | "inversión"
  | "fiscalidad"
  | "planes-pensiones"
  | "fintech"
  | "banca"
  | "otro";
type Tone = "profesional" | "cercano" | "técnico" | "educativo";
type Regulation = "CNMV" | "DGS" | "Banco-España" | "ninguna" | "";

const AGENTS: Array<{ id: AgentId; name: string; description: string }> = [
  { id: "finance-company-profile", name: "Finance Company Profile", description: "Perfil institucional y comparadores" },
  { id: "finance-content-marketing", name: "Finance Content Marketing", description: "Blog, guías y newsletter" },
  { id: "finance-seo", name: "Finance SEO", description: "Keywords y schema financiero" },
  { id: "finance-lead-generation", name: "Finance Lead Generation", description: "Landings simulador y ads" },
  { id: "finance-email-nurturing", name: "Finance Email Nurturing", description: "Secuencia conversión leads" },
  { id: "finance-trust-building", name: "Finance Trust Building", description: "Transparencia y testimonios" },
  { id: "finance-regulatory-content", name: "Finance Regulatory Content", description: "Disclaimer MiFID CNMV/DGS" },
  { id: "finance-referral", name: "Finance Referral", description: "Referidos y partnering" },
  { id: "finance-retention", name: "Finance Retention", description: "Revisión anual y cross-sell ético" },
  { id: "finance-thought-leadership", name: "Finance Thought Leadership", description: "Medios, podcast y LinkedIn" },
];

export default function FinanceDashboard() {
  const [agentId, setAgentId] = useState<AgentId>("finance-company-profile");
  const [companyName, setCompanyName] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("otro");
  const [targetClient, setTargetClient] = useState("");
  const [tone, setTone] = useState<Tone>("profesional");
  const [regulation, setRegulation] = useState<Regulation>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ agentId: string; result: string; generatedAt: string } | null>(null);
  const active = useMemo(() => AGENTS.find((a) => a.id === agentId) ?? AGENTS[0], [agentId]);

  async function runAgent(): Promise<void> {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/os/agents/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agentId,
          input: {
            companyName,
            serviceType,
            targetClient,
            tone,
            ...(regulation !== "" ? { regulation } : {}),
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
      <h2 className="mb-1 text-xl font-semibold text-white">Finance - Lote 22</h2>
      <p className="mb-4 text-sm text-slate-400">10 agentes para finanzas, seguros y fintech compliant.</p>
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
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={serviceType} onChange={(e) => setServiceType(e.target.value as ServiceType)}>
                <option value="asesoría-financiera">asesoría-financiera</option>
                <option value="seguros">seguros</option>
                <option value="hipotecas">hipotecas</option>
                <option value="inversión">inversión</option>
                <option value="fiscalidad">fiscalidad</option>
                <option value="planes-pensiones">planes-pensiones</option>
                <option value="fintech">fintech</option>
                <option value="banca">banca</option>
                <option value="otro">otro</option>
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Target client" value={targetClient} onChange={(e) => setTargetClient(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="profesional">profesional</option>
                <option value="cercano">cercano</option>
                <option value="técnico">técnico</option>
                <option value="educativo">educativo</option>
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={regulation} onChange={(e) => setRegulation(e.target.value as Regulation)}>
                <option value="">Regulación (opcional)</option>
                <option value="CNMV">CNMV</option>
                <option value="DGS">DGS</option>
                <option value="Banco-España">Banco-España</option>
                <option value="ninguna">ninguna</option>
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
