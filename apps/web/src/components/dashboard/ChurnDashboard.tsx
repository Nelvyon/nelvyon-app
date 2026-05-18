"use client";

import { useCallback, useMemo, useState } from "react";

type ChurnRiskLevel = "low" | "medium" | "high" | "critical";

type ChurnAgentId =
  | "churn-risk-scorer"
  | "churn-signal-detector"
  | "churn-segment-classifier"
  | "churn-retention-offer"
  | "churn-reengagement-sequence"
  | "churn-root-cause-analyst"
  | "churn-success-story"
  | "churn-escalation-trigger";

type Row = { id: ChurnAgentId; title: string; subtitle: string };

type ChurnOutput = {
  agentId: string;
  content: string;
  score: number;
  riskLevel: ChurnRiskLevel;
  actions: string[];
};

const accent = "#14b8a6";

const RISK_COLOR: Record<ChurnRiskLevel, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

const AGENTS: Row[] = [
  { id: "churn-risk-scorer", title: "Risk score", subtitle: "0–100 + evidencia" },
  { id: "churn-signal-detector", title: "Señales", subtitle: "Early warnings" },
  { id: "churn-segment-classifier", title: "Segmento", subtitle: "Clasificación riesgo" },
  { id: "churn-retention-offer", title: "Oferta", subtitle: "Retención personalizada" },
  { id: "churn-reengagement-sequence", title: "Secuencia", subtitle: "Multicanal" },
  { id: "churn-root-cause-analyst", title: "Causa raíz", subtitle: "RCA" },
  { id: "churn-success-story", title: "Caso éxito", subtitle: "Peer story" },
  { id: "churn-escalation-trigger", title: "Escalado", subtitle: "Humano sí/no" },
];

export default function ChurnDashboard() {
  const [sector, setSector] = useState("saas");
  const [contactId, setContactId] = useState("contact-demo-001");
  const [planType, setPlanType] = useState("pro");
  const [monthsActive, setMonthsActive] = useState("8");
  const [busyId, setBusyId] = useState<ChurnAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<ChurnAgentId, ChurnOutput>>>({});

  const engagementData = useMemo(
    () => ({
      last_login_days: "12",
      sessions_30d: "4",
      support_tickets_open: "1",
      nps_last: "6",
      feature_adoption_core: "0.35",
    }),
    [],
  );

  const runAgent = useCallback(
    async (agentId: ChurnAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/churn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            input: {
              sector: sector.trim(),
              contactId: contactId.trim(),
              engagementData,
              planType: planType.trim(),
              monthsActive: Number(monthsActive) || 0,
            },
          }),
        });
        const data = (await res.json()) as { result?: ChurnOutput; error?: string };
        if (!res.ok) throw new Error(data.error ?? "request_failed");
        if (!data.result) throw new Error("sin resultado");
        setOutputs((prev) => ({ ...prev, [agentId]: data.result! }));
      } catch {
        setStatus(`Error al ejecutar ${agentId}`);
      } finally {
        setBusyId(null);
      }
    },
    [contactId, engagementData, monthsActive, planType, sector],
  );

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold" style={{ color: accent }}>
          Predicción churn contacto
        </h2>
        {status ? <p className="text-sm text-rose-400">{status}</p> : null}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          Sector
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Contact ID
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Plan
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={planType}
            onChange={(e) => setPlanType(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Meses activo
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={monthsActive}
            onChange={(e) => setMonthsActive(e.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {AGENTS.map((a) => {
          const out = outputs[a.id];
          const score = out?.score ?? null;
          const rl = out?.riskLevel;
          const riskColor = rl ? RISK_COLOR[rl] : undefined;
          return (
            <article
              key={a.id}
              className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 md:p-6"
              style={{ borderColor: `${accent}33` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="line-clamp-2 text-sm md:text-base font-semibold text-zinc-100">{a.title}</h3>
                  <p className="text-xs text-zinc-400">{a.subtitle}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {score != null ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold text-zinc-950"
                      style={{ backgroundColor: accent }}
                      title="Score"
                    >
                      {score}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">—</span>
                  )}
                  {rl ? (
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-950"
                      style={{ backgroundColor: riskColor }}
                      title="Nivel de riesgo"
                    >
                      {rl}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                disabled={busyId !== null}
                className="min-h-[44px] rounded px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50 md:text-base"
                style={{ backgroundColor: accent }}
                onClick={() => void runAgent(a.id)}
              >
                {busyId === a.id ? "Ejecutando…" : "Ejecutar"}
              </button>
              {out?.actions?.length ? (
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-zinc-300">
                  {out.actions.slice(0, 6).map((act, idx) => (
                    <li key={idx}>{act}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Acciones tras ejecutar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
