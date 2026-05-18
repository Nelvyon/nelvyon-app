"use client";

import { useCallback, useMemo, useState } from "react";

type AuditLibraryAgentId =
  | "audit-event-capture"
  | "audit-anomaly-detector"
  | "audit-risk-scorer"
  | "audit-session-tracker"
  | "audit-compliance-reporter"
  | "audit-retention-manager"
  | "audit-export-agent"
  | "audit-alert-dispatcher";

type Row = { id: AuditLibraryAgentId; title: string; subtitle: string };

type AuditLogOutput = {
  logged: boolean;
  auditId: string;
  summary: string;
  riskScore: number;
  anomalyDetected: boolean;
  anomalyReason?: string;
};

type FeedEvent = {
  id: string;
  ts: string;
  actionType: string;
  entityType?: string;
  riskScore: number;
  anomalyDetected: boolean;
  agentId: AuditLibraryAgentId;
};

const accent = "#6366f1";

const AGENTS: Row[] = [
  { id: "audit-event-capture", title: "Captura", subtitle: "Persistencia inmediata" },
  { id: "audit-anomaly-detector", title: "Anomalías", subtitle: "Patrones sospechosos" },
  { id: "audit-risk-scorer", title: "Risk score", subtitle: "0–100" },
  { id: "audit-session-tracker", title: "Sesiones", subtitle: "Correlación" },
  { id: "audit-compliance-reporter", title: "Compliance", subtitle: "SOC2 / GDPR" },
  { id: "audit-retention-manager", title: "Retención", subtitle: "90d / archivo" },
  { id: "audit-export-agent", title: "Export", subtitle: "CSV / JSON" },
  { id: "audit-alert-dispatcher", title: "Alertas", subtitle: "Dispatch" },
];

const ACTION_OPTIONS = [
  "LOGIN",
  "LOGOUT",
  "CONTENT_GENERATED",
  "PLAN_CHANGED",
  "INTEGRATION_ACTIVATED",
  "INTEGRATION_DEACTIVATED",
  "REPORT_DOWNLOADED",
  "AGENT_RUN",
  "API_KEY_CREATED",
  "API_KEY_REVOKED",
  "BILLING_EVENT",
  "CHURN_RISK_DETECTED",
  "SUPPORT_TICKET_CREATED",
  "PASSWORD_CHANGED",
  "MFA_ENABLED",
  "MFA_DISABLED",
  "EXPORT_REQUESTED",
  "GDPR_DELETE_REQUESTED",
] as const;

function riskBadgeClass(score: number): string {
  if (score < 30) return "bg-emerald-600 text-white";
  if (score <= 70) return "bg-amber-500 text-zinc-950";
  return "bg-rose-600 text-white";
}

export default function AuditLogDashboard() {
  const [actionType, setActionType] = useState<string>("AGENT_RUN");
  const [entityType, setEntityType] = useState("os_agent");
  const [entityId, setEntityId] = useState("job_123");
  const [sessionId, setSessionId] = useState("sess_demo");
  const [ipAddress, setIpAddress] = useState("203.0.113.10");
  const [busyId, setBusyId] = useState<AuditLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [events, setEvents] = useState<FeedEvent[]>([]);

  const payloadInput = useMemo(
    () => ({
      actionType,
      entityType: entityType.trim() || undefined,
      entityId: entityId.trim() || undefined,
      sessionId: sessionId.trim() || undefined,
      ipAddress: ipAddress.trim() || undefined,
      userAgent: "AuditLogDashboard/1.0",
      metadata: { source: "dashboard" },
    }),
    [actionType, entityId, entityType, ipAddress, sessionId],
  );

  const runAgent = useCallback(
    async (agentId: AuditLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/auditlog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input: payloadInput }),
        });
        const json = (await res.json()) as { success?: boolean; data?: AuditLogOutput; error?: string };
        if (!res.ok || !json.success || !json.data) throw new Error(json.error ?? "request_failed");
        const d = json.data;
        setEvents((prev) => [
          {
            id: d.auditId,
            ts: new Date().toISOString(),
            actionType: payloadInput.actionType,
            entityType: payloadInput.entityType,
            riskScore: d.riskScore,
            anomalyDetected: d.anomalyDetected,
            agentId,
          },
          ...prev,
        ].slice(0, 40));
      } catch (e: unknown) {
        setStatus(e instanceof Error ? e.message : "Error");
      } finally {
        setBusyId(null);
      }
    },
    [payloadInput],
  );

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold" style={{ color: accent }}>
          Audit log — acciones cliente
        </h2>
        {status ? <p className="text-sm text-rose-400">{status}</p> : null}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          actionType
          <select
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
          >
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          entityType
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          entityId
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          sessionId
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-2">
          ipAddress (opcional)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {AGENTS.map((a) => (
          <article
            key={a.id}
            className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 md:p-6"
            style={{ borderColor: `${accent}44` }}
          >
            <div>
              <h3 className="line-clamp-2 text-sm md:text-base font-semibold text-zinc-100">{a.title}</h3>
              <p className="text-xs text-zinc-400">{a.subtitle}</p>
            </div>
            <button
              type="button"
              disabled={busyId !== null}
              className="min-h-[44px] rounded px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 md:text-base"
              style={{ backgroundColor: accent }}
              onClick={() => void runAgent(a.id)}
            >
              {busyId === a.id ? "Ejecutando…" : "Ejecutar agente"}
            </button>
          </article>
        ))}
      </div>

      <div className="mt-8">
        <h3 className="mb-2 text-sm font-semibold text-zinc-200">Eventos recientes</h3>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400">
              <tr>
                <th className="px-3 py-2">timestamp</th>
                <th className="px-3 py-2">actionType</th>
                <th className="px-3 py-2">entityType</th>
                <th className="px-3 py-2">riskScore</th>
                <th className="px-3 py-2">anomaly</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                    Ejecuta un agente para ver eventos y badges de riesgo.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id} className="border-b border-zinc-800/80">
                    <td className="px-3 py-2 font-mono text-zinc-300">{ev.ts}</td>
                    <td className="px-3 py-2 text-zinc-200">{ev.actionType}</td>
                    <td className="px-3 py-2 text-zinc-400">{ev.entityType ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 font-bold ${riskBadgeClass(ev.riskScore)}`}>
                        {ev.riskScore}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {ev.anomalyDetected ? (
                        <span className="inline-flex animate-pulse rounded-full bg-rose-600 px-2 py-0.5 font-semibold text-white">
                          sí
                        </span>
                      ) : (
                        <span className="text-zinc-500">no</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
