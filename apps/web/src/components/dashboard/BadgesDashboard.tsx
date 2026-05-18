"use client";

import { useCallback, useMemo, useState } from "react";

type BadgesLibraryAgentId =
  | "badges-system-designer"
  | "badges-achievement-copy"
  | "badges-milestone-tracker"
  | "badges-certification-path"
  | "badges-shareable-content"
  | "badges-leaderboard"
  | "badges-email-celebration"
  | "badges-retention-trigger";

type Row = { id: BadgesLibraryAgentId; title: string; subtitle: string };

type BadgesOutput = {
  agentId: string;
  content: string;
  score: number;
  badges: string[];
  milestones: string[];
};

const accent = "#14b8a6";

const AGENTS: Row[] = [
  { id: "badges-system-designer", title: "Sistema", subtitle: "Badges y niveles" },
  { id: "badges-achievement-copy", title: "Copy logros", subtitle: "Nombres y textos" },
  { id: "badges-milestone-tracker", title: "Hitos", subtitle: "Desbloqueos" },
  { id: "badges-certification-path", title: "Certificación", subtitle: "Rutas por nivel" },
  { id: "badges-shareable-content", title: "RRSS", subtitle: "Shareable" },
  { id: "badges-leaderboard", title: "Ranking", subtitle: "Competición" },
  { id: "badges-email-celebration", title: "Email", subtitle: "Celebración" },
  { id: "badges-retention-trigger", title: "Retención", subtitle: "Triggers" },
];

export default function BadgesDashboard() {
  const [sector, setSector] = useState("saas");
  const [productName, setProductName] = useState("Producto demo");
  const [currentLevel, setCurrentLevel] = useState("intermedio");
  const [activityKey, setActivityKey] = useState("sesiones_7d");
  const [activityValue, setActivityValue] = useState("12");
  const [busyId, setBusyId] = useState<BadgesLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<BadgesLibraryAgentId, BadgesOutput>>>({});

  const userActivity = useMemo(() => {
    const k = activityKey.trim();
    const v = activityValue.trim();
    if (!k || !v) return undefined;
    return { [k]: v };
  }, [activityKey, activityValue]);

  const payloadBase = useMemo(
    () => ({
      sector,
      productName,
      currentLevel,
      userActivity,
    }),
    [currentLevel, productName, sector, userActivity],
  );

  const runAgent = useCallback(
    async (agentId: BadgesLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const input: Record<string, unknown> = {
          sector: payloadBase.sector.trim(),
          productName: payloadBase.productName.trim(),
        };
        if (payloadBase.currentLevel.trim()) input.currentLevel = payloadBase.currentLevel.trim();
        if (payloadBase.userActivity) input.userActivity = payloadBase.userActivity;

        const res = await fetch("/api/os/agents/badges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input }),
        });
        const data = (await res.json()) as { result?: BadgesOutput; error?: string };
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
          Certificaciones y badges
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
          Nivel actual
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={currentLevel}
            onChange={(e) => setCurrentLevel(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Actividad (clave)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={activityKey}
            onChange={(e) => setActivityKey(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Actividad (valor)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={activityValue}
            onChange={(e) => setActivityValue(e.target.value)}
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
              {out?.badges?.length ? (
                <ul className="mt-1 max-h-36 space-y-2 overflow-y-auto text-xs text-zinc-300">
                  {out.badges.slice(0, 8).map((b, idx) => (
                    <li key={idx} className="rounded border border-zinc-800 bg-zinc-950/50 p-2">
                      {b.length > 200 ? `${b.slice(0, 200)}…` : b}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Badges tras generar.</p>
              )}
              {out?.milestones?.length ? (
                <div className="flex flex-wrap gap-1">
                  {out.milestones.slice(0, 10).map((m, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border px-2 py-0.5 text-[10px] text-zinc-200"
                      style={{ borderColor: `${accent}66`, color: accent }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Hitos tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
