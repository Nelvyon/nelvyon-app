"use client";

import { useCallback, useMemo, useState } from "react";

type MarketingAgentId =
  | "legal-firm-profile"
  | "legal-content-marketing"
  | "legal-seo"
  | "legal-ads"
  | "legal-client-email"
  | "legal-consultation-nurturing"
  | "legal-reputation"
  | "legal-referral"
  | "legal-thought-leadership";

type ComplianceAgentId =
  | "legal-gdpr"
  | "legal-tos"
  | "legal-privacidad"
  | "legal-contratos"
  | "legal-nda"
  | "legal-sla"
  | "legal-jurisdiccion"
  | "legal-actualizacion";

type PracticeArea = "civil" | "laboral" | "penal" | "mercantil" | "fiscal" | "familia" | "inmobiliario" | "administrativo" | "otro";
type Tone = "profesional" | "cercano" | "técnico" | "accesible";

const MARKETING_AGENTS: Array<{ id: MarketingAgentId; name: string; description: string }> = [
  { id: "legal-firm-profile", name: "Legal Firm Profile", description: "Perfil institucional y presencia en directorios" },
  { id: "legal-content-marketing", name: "Legal Content Marketing", description: "Blog, lead magnets y política de contenido" },
  { id: "legal-seo", name: "Legal SEO", description: "SEO local, schema y reseñas" },
  { id: "legal-ads", name: "Legal Ads", description: "Search y Meta compliant" },
  { id: "legal-client-email", name: "Legal Client Email", description: "Secuencias email cliente" },
  { id: "legal-consultation-nurturing", name: "Legal Consultation Nurturing", description: "Convertir consultas en clientes" },
  { id: "legal-reputation", name: "Legal Reputation", description: "Reseñas, directorios y crisis" },
  { id: "legal-referral", name: "Legal Referral", description: "Referidos y partnering" },
  { id: "legal-thought-leadership", name: "Legal Thought Leadership", description: "Medios, podcasts y LinkedIn" },
];

const COMPLIANCE_AGENTS: Array<{ id: ComplianceAgentId; title: string; subtitle: string }> = [
  { id: "legal-gdpr", title: "GDPR / EEE", subtitle: "ROPA, DPIA, transferencias" },
  { id: "legal-tos", title: "TOS", subtitle: "Términos SaaS multi-jurisdicción" },
  { id: "legal-privacidad", title: "Privacidad", subtitle: "Política modular + cookies" },
  { id: "legal-contratos", title: "Contratos", subtitle: "MSA post-cierre" },
  { id: "legal-nda", title: "NDA", subtitle: "Mutuo / unilateral" },
  { id: "legal-sla", title: "SLA", subtitle: "Métricas y créditos" },
  { id: "legal-jurisdiccion", title: "Jurisdicción", subtitle: "Ley y foro (~195 países)" },
  { id: "legal-actualizacion", title: "Actualización", subtitle: "Cambios normativos y versionado" },
];

type ComplianceOutput = { agentId: string; result: string; score: number; recommendations: string[] };

const accent = "#38bdf8";

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function LegalDashboard() {
  const [tab, setTab] = useState<"marketing" | "compliance">("compliance");

  const [agentId, setAgentId] = useState<MarketingAgentId>("legal-firm-profile");
  const [firmName, setFirmName] = useState("");
  const [practiceArea, setPracticeArea] = useState<PracticeArea>("otro");
  const [targetClient, setTargetClient] = useState("");
  const [tone, setTone] = useState<Tone>("profesional");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ agentId: string; result: string; generatedAt: string } | null>(null);
  const active = useMemo(() => MARKETING_AGENTS.find((a) => a.id === agentId) ?? MARKETING_AGENTS[0], [agentId]);

  const [businessName, setBusinessName] = useState("Operador SaaS con clientes UE y US");
  const [servicesText, setServicesText] = useState("IA generativa, almacenamiento cloud, analytics");
  const [targetsText, setTargetsText] = useState("B2B, GDPR, CCPA, LGPD");
  const [busyId, setBusyId] = useState<ComplianceAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<ComplianceAgentId, ComplianceOutput>>>({});

  const compliancePayload = useMemo(
    () => ({
      businessName,
      services: splitCsv(servicesText),
      targets: splitCsv(targetsText),
      metadata: { program: "legal_v1" },
    }),
    [businessName, servicesText, targetsText],
  );

  const runMarketingAgent = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/os/agents/legal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ agentId, input: { firmName, practiceArea, targetClient, tone, location: location || undefined } }),
      });
      const data = (await response.json()) as { success?: boolean; result?: { agentId: string; result: string; generatedAt: string }; error?: string };
      if (!response.ok || !data.success || !data.result) throw new Error(data.error ?? "Error procesando solicitud");
      setResult(data.result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }, [agentId, firmName, practiceArea, targetClient, tone, location]);

  const runComplianceAgent = useCallback(
    async (id: ComplianceAgentId): Promise<void> => {
      setBusyId(id);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/legal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ agentId: id, input: compliancePayload }),
        });
        const data = (await res.json()) as { success?: boolean; result?: ComplianceOutput; error?: string };
        if (!res.ok || !data.success || !data.result) throw new Error(data.error ?? "request_failed");
        setOutputs((prev) => ({ ...prev, [id]: data.result! }));
      } catch (e: unknown) {
        setStatus(e instanceof Error ? e.message : "Error");
      } finally {
        setBusyId(null);
      }
    },
    [compliancePayload],
  );

  async function copyResult(): Promise<void> {
    if (!result?.result) return;
    await navigator.clipboard.writeText(result.result);
  }

  return (
    <div className="min-h-[560px] rounded-xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-xl">
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
        <h2 className="text-xl font-semibold text-white">Legal OS</h2>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setTab("compliance")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "compliance" ? "bg-sky-600 text-white" : "bg-slate-900 text-slate-400"}`}
          >
            Compliance mundial v1
          </button>
          <button
            type="button"
            onClick={() => setTab("marketing")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "marketing" ? "bg-sky-600 text-white" : "bg-slate-900 text-slate-400"}`}
          >
            Marketing despacho
          </button>
        </div>
      </div>

      {tab === "compliance" ? (
        <section>
          <p className="mb-4 text-sm text-slate-400">8 agentes — documentos, jurisdicciones y ciclo de vida legal (informativo; no sustituye asesoramiento).</p>
          {status ? <p className="mb-3 text-sm text-red-400">{status}</p> : null}

          <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
              Organización / producto
              <input
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-100"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
              Servicios / stack (coma)
              <input
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-100"
                value={servicesText}
                onChange={(e) => setServicesText(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
              Segmentos / targets (coma)
              <input
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-100"
                value={targetsText}
                onChange={(e) => setTargetsText(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {COMPLIANCE_AGENTS.map((a) => {
              const out = outputs[a.id];
              const score = out?.score ?? null;
              return (
                <article
                  key={a.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/40 p-4 md:p-6"
                  style={{ borderColor: `${accent}33` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="line-clamp-2 text-sm md:text-base font-semibold text-slate-100">{a.title}</h3>
                      <p className="text-xs text-slate-400">{a.subtitle}</p>
                    </div>
                    {score != null ? (
                      <span className="rounded-full px-2 py-0.5 text-xs font-bold text-slate-950" style={{ backgroundColor: accent }}>
                        {score}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={busyId !== null}
                    className="min-h-[44px] rounded px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50 md:text-base"
                    style={{ backgroundColor: accent }}
                    onClick={() => void runComplianceAgent(a.id)}
                  >
                    {busyId === a.id ? "Ejecutando…" : "Generar"}
                  </button>
                  {out?.recommendations?.length ? (
                    <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto text-xs text-slate-300">
                      {out.recommendations.slice(0, 6).map((h, idx) => (
                        <li key={idx} className="rounded border border-slate-800 bg-slate-950/50 p-1.5">
                          {h.length > 160 ? `${h.slice(0, 160)}…` : h}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500">Recomendaciones tras generar.</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-400">9 agentes para despachos, notarías y asesores jurídicos.</p>
          {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-2">
              {MARKETING_AGENTS.map((agent) => (
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
                  <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Firm name" value={firmName} onChange={(e) => setFirmName(e.target.value)} />
                  <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={practiceArea} onChange={(e) => setPracticeArea(e.target.value as PracticeArea)}>
                    <option value="civil">civil</option>
                    <option value="laboral">laboral</option>
                    <option value="penal">penal</option>
                    <option value="mercantil">mercantil</option>
                    <option value="fiscal">fiscal</option>
                    <option value="familia">familia</option>
                    <option value="inmobiliario">inmobiliario</option>
                    <option value="administrativo">administrativo</option>
                    <option value="otro">otro</option>
                  </select>
                  <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Target client" value={targetClient} onChange={(e) => setTargetClient(e.target.value)} />
                  <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                    <option value="profesional">profesional</option>
                    <option value="cercano">cercano</option>
                    <option value="técnico">técnico</option>
                    <option value="accesible">accesible</option>
                  </select>
                  <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void runMarketingAgent()}
                  className="mt-4 rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {loading ? "Generando..." : "Ejecutar agente"}
                </button>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-200">Resultado</p>
                  <button type="button" onClick={() => void copyResult()} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200" disabled={!result?.result}>
                    Copiar
                  </button>
                </div>
                <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">{result?.result ? result.result : "Sin resultado todavia."}</pre>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
