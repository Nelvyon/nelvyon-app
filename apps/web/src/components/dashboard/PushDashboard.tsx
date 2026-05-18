"use client";

import { useCallback, useMemo, useState } from "react";

type PushLibraryAgentId =
  | "push-welcome-notif"
  | "push-engagement-notif"
  | "push-transactional-notif"
  | "push-promotional-notif"
  | "push-abandonment-notif"
  | "push-milestone-notif"
  | "push-personalization"
  | "push-optimization";

type Row = { id: PushLibraryAgentId; title: string; subtitle: string };

type PushOutput = {
  agentId: string;
  content: string;
  score: number;
  notifications: string[];
  deepLinks: string[];
};

const accent = "#14b8a6";

const AGENTS: Row[] = [
  { id: "push-welcome-notif", title: "Bienvenida", subtitle: "Onboarding push" },
  { id: "push-engagement-notif", title: "Reengagement", subtitle: "Usuarios inactivos" },
  { id: "push-transactional-notif", title: "Transaccional", subtitle: "Alertas y confirmaciones" },
  { id: "push-promotional-notif", title: "Promo", subtitle: "Alta conversión" },
  { id: "push-abandonment-notif", title: "Abandono", subtitle: "Secuencia recuperación" },
  { id: "push-milestone-notif", title: "Hitos", subtitle: "Celebración" },
  { id: "push-personalization", title: "Personalización", subtitle: "Segmento y comportamiento" },
  { id: "push-optimization", title: "Optimización", subtitle: "Timing y frecuencia" },
];

export default function PushDashboard() {
  const [sector, setSector] = useState("ecommerce");
  const [brand, setBrand] = useState("MiMarca");
  const [triggerEvent, setTriggerEvent] = useState("usuario_inactivo_7d");
  const [userSegment, setUserSegment] = useState("high_intent");
  const [platform, setPlatform] = useState<"ios" | "android" | "both" | "">("both");
  const [busyId, setBusyId] = useState<PushLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<PushLibraryAgentId, PushOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      sector,
      brand,
      triggerEvent,
      userSegment: userSegment.trim() || undefined,
      platform: (platform || undefined) as "ios" | "android" | "both" | undefined,
    }),
    [brand, platform, sector, triggerEvent, userSegment],
  );

  const runAgent = useCallback(
    async (agentId: PushLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            input: {
              sector: payloadBase.sector.trim(),
              brand: payloadBase.brand.trim(),
              triggerEvent: payloadBase.triggerEvent.trim(),
              ...(payloadBase.userSegment ? { userSegment: payloadBase.userSegment } : {}),
              ...(payloadBase.platform ? { platform: payloadBase.platform } : {}),
            },
          }),
        });
        const data = (await res.json()) as { result?: PushOutput; error?: string };
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
          Notificaciones push móvil
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
          Marca
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Plataforma
          <select
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as "ios" | "android" | "both" | "")}
          >
            <option value="">(omitir)</option>
            <option value="ios">iOS</option>
            <option value="android">Android</option>
            <option value="both">Ambas</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Evento / disparador
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={triggerEvent}
            onChange={(e) => setTriggerEvent(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Segmento (opcional)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={userSegment}
            onChange={(e) => setUserSegment(e.target.value)}
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
              {out?.notifications?.length ? (
                <ul className="mt-1 max-h-36 space-y-2 overflow-y-auto text-xs text-zinc-300">
                  {out.notifications.slice(0, 8).map((line, idx) => (
                    <li key={idx} className="rounded border border-zinc-800 bg-zinc-950/50 p-2">
                      {line.length > 220 ? `${line.slice(0, 220)}…` : line}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Notificaciones tras generar.</p>
              )}
              {out?.deepLinks?.length ? (
                <div className="flex flex-wrap gap-1">
                  {out.deepLinks.slice(0, 10).map((f, idx) => (
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
                <p className="text-xs text-zinc-500">Deep links tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
