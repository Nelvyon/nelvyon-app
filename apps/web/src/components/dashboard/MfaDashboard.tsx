"use client";

import { useCallback, useMemo, useState } from "react";

type MfaLibraryAgentId =
  | "mfa-setup-guide"
  | "mfa-risk-assessor"
  | "mfa-recovery-flow"
  | "mfa-compliance-checker"
  | "mfa-user-education"
  | "mfa-anomaly-detector"
  | "mfa-policy-generator"
  | "mfa-incident-response";

type Row = { id: MfaLibraryAgentId; title: string; subtitle: string };

type MfaOutput = {
  agentId: string;
  content: string;
  score: number;
  instructions: string[];
  securityTips: string[];
};

const accent = "#14b8a6";

const AGENTS: Row[] = [
  { id: "mfa-setup-guide", title: "Guía setup", subtitle: "Configuración 2FA" },
  { id: "mfa-risk-assessor", title: "Riesgo", subtitle: "Método óptimo" },
  { id: "mfa-recovery-flow", title: "Recuperación", subtitle: "Pérdida de 2FA" },
  { id: "mfa-compliance-checker", title: "Compliance", subtitle: "Sector / normativa" },
  { id: "mfa-user-education", title: "Educación", subtitle: "Usuario final" },
  { id: "mfa-anomaly-detector", title: "Anomalías", subtitle: "Patrones de acceso" },
  { id: "mfa-policy-generator", title: "Política", subtitle: "Acceso corporativo" },
  { id: "mfa-incident-response", title: "Incidentes", subtitle: "Respuesta IR" },
];

export default function MfaDashboard() {
  const [sector, setSector] = useState("fintech");
  const [userEmail, setUserEmail] = useState("usuario@empresa.com");
  const [mfaMethod, setMfaMethod] = useState<"" | "totp" | "sms" | "email" | "backup">("totp");
  const [riskLevel, setRiskLevel] = useState<"" | "low" | "medium" | "high">("medium");
  const [busyId, setBusyId] = useState<MfaLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<MfaLibraryAgentId, MfaOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      sector,
      userEmail,
      ...(mfaMethod ? { mfaMethod } : {}),
      ...(riskLevel ? { riskLevel } : {}),
    }),
    [mfaMethod, riskLevel, sector, userEmail],
  );

  const runAgent = useCallback(
    async (agentId: MfaLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/mfa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            input: {
              sector: payloadBase.sector.trim(),
              userEmail: payloadBase.userEmail.trim(),
              ...(payloadBase.mfaMethod ? { mfaMethod: payloadBase.mfaMethod } : {}),
              ...(payloadBase.riskLevel ? { riskLevel: payloadBase.riskLevel } : {}),
            },
          }),
        });
        const data = (await res.json()) as { result?: MfaOutput; error?: string };
        if (!res.ok) throw new Error(data.error ?? "request_failed");
        if (!data.result) throw new Error("sin resultado");
        setOutputs((prev) => ({ ...prev, [agentId]: data.result! }));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Error";
        setStatus(msg);
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
          2FA / MFA obligatorio
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
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-2">
          Email usuario (brief)
          <input
            type="email"
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Método MFA
          <select
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={mfaMethod}
            onChange={(e) => setMfaMethod(e.target.value as typeof mfaMethod)}
          >
            <option value="">(omitir)</option>
            <option value="totp">TOTP</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
            <option value="backup">Códigos backup</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Riesgo
          <select
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value as typeof riskLevel)}
          >
            <option value="">(omitir)</option>
            <option value="low">Bajo</option>
            <option value="medium">Medio</option>
            <option value="high">Alto</option>
          </select>
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
              {out?.instructions?.length ? (
                <ol className="mt-1 max-h-48 list-decimal space-y-2 overflow-y-auto pl-4 text-xs text-zinc-300">
                  {out.instructions.slice(0, 12).map((line, idx) => (
                    <li key={idx} className="rounded border border-zinc-800 bg-zinc-950/50 p-2 pl-2 marker:text-zinc-500">
                      {line.length > 280 ? `${line.slice(0, 280)}…` : line}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-zinc-500">Pasos de seguridad tras generar.</p>
              )}
              {out?.securityTips?.length ? (
                <div className="flex flex-wrap gap-1">
                  {out.securityTips.slice(0, 10).map((tip, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border px-2 py-0.5 text-[10px] text-zinc-200"
                      style={{ borderColor: `${accent}66`, color: accent }}
                    >
                      {tip}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Tips tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
