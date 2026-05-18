"use client";

import { useCallback, useMemo, useState } from "react";

type SlaLibraryAgentId =
  | "sla-incident-classifier"
  | "sla-uptime-monitor"
  | "sla-client-notification"
  | "sla-compensation-calculator"
  | "sla-postmortem"
  | "sla-escalation-protocol"
  | "sla-root-cause"
  | "sla-reputation-repair";

type Row = { id: SlaLibraryAgentId; title: string; subtitle: string };

type SlaOutput = {
  agentId: string;
  content: string;
  score: number;
  compensationOffer: string;
  communications: string[];
};

const accent = "#14b8a6";

const AGENTS: Row[] = [
  { id: "sla-incident-classifier", title: "Clasificador", subtitle: "P1–P4" },
  { id: "sla-uptime-monitor", title: "Uptime", subtitle: "Violaciones SLA" },
  { id: "sla-client-notification", title: "Cliente", subtitle: "Proactiva" },
  { id: "sla-compensation-calculator", title: "Compensación", subtitle: "Auto" },
  { id: "sla-postmortem", title: "Postmortem", subtitle: "Ejecutivo" },
  { id: "sla-escalation-protocol", title: "Escalada", subtitle: "Interna" },
  { id: "sla-root-cause", title: "Causa raíz", subtitle: "Técnico" },
  { id: "sla-reputation-repair", title: "Confianza", subtitle: "Post-incidente" },
];

export default function SlaDashboard() {
  const [sector, setSector] = useState("saas");
  const [incidentType, setIncidentType] = useState("degradación API");
  const [downtimeMinutes, setDowntimeMinutes] = useState("42");
  const [affectedFeaturesRaw, setAffectedFeaturesRaw] = useState("auth, webhooks");
  const [planType, setPlanType] = useState("enterprise");
  const [busyId, setBusyId] = useState<SlaLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<SlaLibraryAgentId, SlaOutput>>>({});

  const affectedFeatures = useMemo(() => {
    const parts = affectedFeaturesRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length ? parts : undefined;
  }, [affectedFeaturesRaw]);

  const payloadBase = useMemo(
    () => ({
      sector,
      incidentType,
      downtimeMinutes: downtimeMinutes.trim() ? Number(downtimeMinutes.trim()) : undefined,
      affectedFeatures,
      planType,
    }),
    [affectedFeatures, downtimeMinutes, incidentType, planType, sector],
  );

  const runAgent = useCallback(
    async (agentId: SlaLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const input: Record<string, unknown> = {
          sector: payloadBase.sector.trim(),
          incidentType: payloadBase.incidentType.trim(),
        };
        if (payloadBase.downtimeMinutes != null && Number.isFinite(payloadBase.downtimeMinutes)) {
          input.downtimeMinutes = payloadBase.downtimeMinutes;
        }
        if (payloadBase.affectedFeatures?.length) input.affectedFeatures = payloadBase.affectedFeatures;
        if (payloadBase.planType.trim()) input.planType = payloadBase.planType.trim();

        const res = await fetch("/api/os/agents/sla", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input }),
        });
        const data = (await res.json()) as { result?: SlaOutput; error?: string };
        if (!res.ok) throw new Error(data.error ?? "request_failed");
        if (!data.result) throw new Error("sin resultado");
        setOutputs((prev) => ({ ...prev, [agentId]: data.result! }));
      } catch {
        setStatus(`Error al ejecutar ${agentId}`);
      } finally {
        setBusyId(null);
      }
    },
    [payloadBase],
  );

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold" style={{ color: accent }}>
          SLA monitor y compensación
        </h2>
        {status ? <p className="text-sm text-rose-400">{status}</p> : null}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Sector
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          Tipo incidente
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={incidentType}
            onChange={(e) => setIncidentType(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Minutos caídos
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={downtimeMinutes}
            onChange={(e) => setDowntimeMinutes(e.target.value)}
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
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Features afectadas (coma)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={affectedFeaturesRaw}
            onChange={(e) => setAffectedFeaturesRaw(e.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {AGENTS.map((a) => {
          const out = outputs[a.id];
          const score = out?.score ?? null;
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
              </div>
              <button
                type="button"
                disabled={busyId !== null}
                className="min-h-[44px] rounded px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50 md:text-base"
                style={{ backgroundColor: accent }}
                onClick={() => void runAgent(a.id)}
              >
                {busyId === a.id ? "Ejecutando…" : "Generar"}
              </button>
              {out?.compensationOffer ? (
                <p
                  className="rounded border p-2 text-xs font-medium leading-snug text-zinc-100"
                  style={{ borderColor: `${accent}55`, backgroundColor: `${accent}14` }}
                >
                  {out.compensationOffer.length > 400
                    ? `${out.compensationOffer.slice(0, 400)}…`
                    : out.compensationOffer}
                </p>
              ) : (
                <p className="text-xs text-zinc-500">Compensación / oferta tras generar.</p>
              )}
              {out?.communications?.length ? (
                <ul className="max-h-40 space-y-2 overflow-y-auto text-xs text-zinc-300">
                  {out.communications.slice(0, 8).map((msg, idx) => (
                    <li key={idx} className="rounded border border-zinc-800 bg-zinc-950/50 p-2">
                      {msg.length > 220 ? `${msg.slice(0, 220)}…` : msg}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Comunicaciones tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
