"use client";

import { useCallback, useMemo, useState } from "react";

type MobileLibraryAgentId =
  | "mobile-onboarding-flow"
  | "mobile-push-notification"
  | "mobile-aso-ranking"
  | "mobile-retention-flow"
  | "mobile-in-app-messaging"
  | "mobile-rating-request"
  | "mobile-deep-link-strategy"
  | "mobile-revenue-optimization";

type Row = { id: MobileLibraryAgentId; title: string; subtitle: string };

type MobileOutput = {
  agentId: string;
  content: string;
  score: number;
  screens: string[];
  features: string[];
};

const accent = "#14b8a6";

const AGENTS: Row[] = [
  { id: "mobile-onboarding-flow", title: "Onboarding", subtitle: "Flujo y UX" },
  { id: "mobile-push-notification", title: "Push", subtitle: "Secuencias" },
  { id: "mobile-aso-ranking", title: "ASO", subtitle: "Store ranking" },
  { id: "mobile-retention-flow", title: "Retención", subtitle: "Win-back" },
  { id: "mobile-in-app-messaging", title: "In-app", subtitle: "Upsell / NPS" },
  { id: "mobile-rating-request", title: "Ratings", subtitle: "5★ flow" },
  { id: "mobile-deep-link-strategy", title: "Deep links", subtitle: "Campañas" },
  { id: "mobile-revenue-optimization", title: "Revenue", subtitle: "Paywall" },
];

export default function MobileDashboard() {
  const [sector, setSector] = useState("consumer");
  const [appName, setAppName] = useState("MiApp demo");
  const [platform, setPlatform] = useState<"ios" | "android" | "both">("both");
  const [targetAudience, setTargetAudience] = useState("Usuarios 25–40 años");
  const [appGoal, setAppGoal] = useState("Retención D7 y monetización");
  const [busyId, setBusyId] = useState<MobileLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<MobileLibraryAgentId, MobileOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      sector,
      appName,
      platform,
      targetAudience,
      appGoal,
    }),
    [appGoal, appName, platform, sector, targetAudience],
  );

  const runAgent = useCallback(
    async (agentId: MobileLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/mobile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            input: {
              sector: payloadBase.sector.trim(),
              appName: payloadBase.appName.trim(),
              platform: payloadBase.platform,
              targetAudience: payloadBase.targetAudience.trim(),
              appGoal: payloadBase.appGoal.trim(),
            },
          }),
        });
        const data = (await res.json()) as { result?: MobileOutput; error?: string };
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
          App móvil nativa
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
          App
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Plataforma
          <select
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as "ios" | "android" | "both")}
          >
            <option value="ios">iOS</option>
            <option value="android">Android</option>
            <option value="both">Ambas</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Audiencia
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Objetivo app
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={appGoal}
            onChange={(e) => setAppGoal(e.target.value)}
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
              {out?.screens?.length ? (
                <ul className="mt-1 max-h-36 space-y-2 overflow-y-auto text-xs text-zinc-300">
                  {out.screens.slice(0, 8).map((s, idx) => (
                    <li key={idx} className="rounded border border-zinc-800 bg-zinc-950/50 p-2">
                      {s.length > 200 ? `${s.slice(0, 200)}…` : s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Pantallas / pasos tras generar.</p>
              )}
              {out?.features?.length ? (
                <div className="flex flex-wrap gap-1">
                  {out.features.slice(0, 10).map((f, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border px-2 py-0.5 text-[10px] text-zinc-200"
                      style={{ borderColor: `${accent}66`, color: accent }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Features tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
