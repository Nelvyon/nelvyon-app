"use client";

import { useMemo, useState } from "react";

type AgentId =
  | "education-course-description"
  | "education-sales-page"
  | "education-email-nurturing"
  | "education-content-marketing"
  | "education-webinar-script"
  | "education-student-testimonial"
  | "education-seo"
  | "education-ads"
  | "education-community"
  | "education-partnership"
  | "education-retention"
  | "education-upsell";
type EducationType = "academia-online" | "escuela-presencial" | "universidad" | "formador-independiente" | "plataforma-elearning" | "bootcamp";
type SubjectArea = "tecnología" | "marketing" | "negocios" | "idiomas" | "diseño" | "salud" | "desarrollo-personal" | "otro";
type Tone = "profesional" | "motivador" | "cercano" | "académico";
type Format = "curso-grabado" | "directo" | "híbrido" | "presencial";

const AGENTS: Array<{ id: AgentId; name: string; description: string }> = [
  { id: "education-course-description", name: "Education Course Description", description: "Descripción completa del curso" },
  { id: "education-sales-page", name: "Education Sales Page", description: "Sales page de alta conversión" },
  { id: "education-email-nurturing", name: "Education Email Nurturing", description: "Secuencia de 6 emails" },
  { id: "education-content-marketing", name: "Education Content Marketing", description: "Posicionamiento educativo" },
  { id: "education-webinar-script", name: "Education Webinar Script", description: "Guion de webinar de ventas" },
  { id: "education-student-testimonial", name: "Education Student Testimonial", description: "Sistema de testimonios" },
  { id: "education-seo", name: "Education SEO", description: "SEO para e-learning" },
  { id: "education-ads", name: "Education Ads", description: "Paid media para captación" },
  { id: "education-community", name: "Education Community", description: "Estrategia de comunidad" },
  { id: "education-partnership", name: "Education Partnership", description: "Partnerships educativos" },
  { id: "education-retention", name: "Education Retention", description: "Retención y completion rate" },
  { id: "education-upsell", name: "Education Upsell", description: "Upsell y LTV" },
];

export default function EducationDashboard() {
  const [agentId, setAgentId] = useState<AgentId>("education-course-description");
  const [institutionName, setInstitutionName] = useState("");
  const [educationType, setEducationType] = useState<EducationType>("plataforma-elearning");
  const [targetStudent, setTargetStudent] = useState("");
  const [subjectArea, setSubjectArea] = useState<SubjectArea>("otro");
  const [tone, setTone] = useState<Tone>("profesional");
  const [format, setFormat] = useState<Format>("curso-grabado");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ agentId: string; result: string; generatedAt: string } | null>(null);
  const active = useMemo(() => AGENTS.find((a) => a.id === agentId) ?? AGENTS[0], [agentId]);

  async function runAgent(): Promise<void> {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/os/agents/education", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ agentId, input: { institutionName, educationType, targetStudent, subjectArea, tone, format } }),
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
      <h2 className="mb-1 text-xl font-semibold text-white">Education - Lote 18</h2>
      <p className="mb-4 text-sm text-slate-400">12 agentes para academias y formación.</p>
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
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Institution name" value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={educationType} onChange={(e) => setEducationType(e.target.value as EducationType)}>
                <option value="academia-online">academia-online</option><option value="escuela-presencial">escuela-presencial</option><option value="universidad">universidad</option><option value="formador-independiente">formador-independiente</option><option value="plataforma-elearning">plataforma-elearning</option><option value="bootcamp">bootcamp</option>
              </select>
              <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Target student" value={targetStudent} onChange={(e) => setTargetStudent(e.target.value)} />
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={subjectArea} onChange={(e) => setSubjectArea(e.target.value as SubjectArea)}>
                <option value="tecnología">tecnología</option><option value="marketing">marketing</option><option value="negocios">negocios</option><option value="idiomas">idiomas</option><option value="diseño">diseño</option><option value="salud">salud</option><option value="desarrollo-personal">desarrollo-personal</option><option value="otro">otro</option>
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="profesional">profesional</option><option value="motivador">motivador</option><option value="cercano">cercano</option><option value="académico">académico</option>
              </select>
              <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={format} onChange={(e) => setFormat(e.target.value as Format)}>
                <option value="curso-grabado">curso-grabado</option><option value="directo">directo</option><option value="híbrido">híbrido</option><option value="presencial">presencial</option>
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

