"use client";

import { useCallback, useMemo, useState } from "react";

type OnboardingLibraryAgentId =
  | "onboarding-welcome-flow"
  | "onboarding-checklist-builder"
  | "onboarding-tooltip-copy"
  | "onboarding-progress-nudge"
  | "onboarding-video-script"
  | "onboarding-email-sequence"
  | "onboarding-dropoff-recovery"
  | "onboarding-success-milestone";

type Row = { id: OnboardingLibraryAgentId; title: string; subtitle: string };

type OnboardingOutput = {
  agentId: string;
  content: string;
  score: number;
  steps: string[];
  nextActions: string[];
};

const accent = "#14b8a6";

const AGENTS: Row[] = [
  { id: "onboarding-welcome-flow", title: "Bienvenida", subtitle: "Flujo inicial" },
  { id: "onboarding-checklist-builder", title: "Checklist", subtitle: "Activación" },
  { id: "onboarding-tooltip-copy", title: "Tooltips", subtitle: "In-app" },
  { id: "onboarding-progress-nudge", title: "Progreso", subtitle: "Nudges" },
  { id: "onboarding-video-script", title: "Video", subtitle: "Tutoriales" },
  { id: "onboarding-email-sequence", title: "Emails", subtitle: "D1–D30" },
  { id: "onboarding-dropoff-recovery", title: "Drop-off", subtitle: "Recuperación" },
  { id: "onboarding-success-milestone", title: "Hitos", subtitle: "Éxito" },
];

export default function OnboardingDashboard() {
  const [sector, setSector] = useState("saas");
  const [productName, setProductName] = useState("Producto demo");
  const [userRole, setUserRole] = useState("admin");
  const [planType, setPlanType] = useState("pro");
  const [completedStepsRaw, setCompletedStepsRaw] = useState("");
  const [busyId, setBusyId] = useState<OnboardingLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<OnboardingLibraryAgentId, OnboardingOutput>>>({});

  const completedSteps = useMemo(() => {
    const parts = completedStepsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length ? parts : undefined;
  }, [completedStepsRaw]);

  const payloadBase = useMemo(
    () => ({
      sector,
      productName,
      userRole,
      planType,
      completedSteps,
    }),
    [completedSteps, planType, productName, sector, userRole],
  );

  const runAgent = useCallback(
    async (agentId: OnboardingLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const input: Record<string, unknown> = {
          sector: payloadBase.sector.trim(),
          productName: payloadBase.productName.trim(),
        };
        if (payloadBase.userRole.trim()) input.userRole = payloadBase.userRole.trim();
        if (payloadBase.planType.trim()) input.planType = payloadBase.planType.trim();
        if (payloadBase.completedSteps?.length) input.completedSteps = payloadBase.completedSteps;

        const res = await fetch("/api/os/agents/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input }),
        });
        const data = (await res.json()) as { result?: OnboardingOutput; error?: string };
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
          Onboarding automático guiado
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
        <label className="flex flex-col gap-1 text-sm">
          Producto
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Rol
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={userRole}
            onChange={(e) => setUserRole(e.target.value)}
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
          Pasos completados (coma)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            placeholder="cuenta creada, integración email"
            value={completedStepsRaw}
            onChange={(e) => setCompletedStepsRaw(e.target.value)}
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
              {out?.steps?.length ? (
                <ol className="mt-1 max-h-36 list-decimal space-y-1 overflow-y-auto pl-4 text-xs text-zinc-300">
                  {out.steps.slice(0, 8).map((s, idx) => (
                    <li key={idx} className="rounded border border-zinc-800 bg-zinc-950/50 p-1.5 pl-2">
                      {s.length > 180 ? `${s.slice(0, 180)}…` : s}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-zinc-500">Pasos tras generar.</p>
              )}
              {out?.nextActions?.length ? (
                <div className="flex flex-wrap gap-1">
                  {out.nextActions.slice(0, 10).map((act, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border px-2 py-0.5 text-[10px] text-zinc-200"
                      style={{ borderColor: `${accent}66`, color: accent }}
                    >
                      {act}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Acciones siguientes tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
