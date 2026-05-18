"use client";

import { useCallback, useMemo, useState } from "react";

type TimezoneLibraryAgentId =
  | "timezone-detector"
  | "timezone-scheduler"
  | "timezone-converter"
  | "timezone-optimal"
  | "timezone-notifier"
  | "timezone-report"
  | "timezone-calendar"
  | "timezone-audit";

type Row = { id: TimezoneLibraryAgentId; title: string; subtitle: string };

type TimezoneOutput = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

const accent = "#38bdf8";

const AGENTS: Row[] = [
  { id: "timezone-detector", title: "Detector TZ", subtitle: "IP / país" },
  { id: "timezone-scheduler", title: "Scheduler", subtitle: "Hora local" },
  { id: "timezone-converter", title: "Conversor", subtitle: "Reporting" },
  { id: "timezone-optimal", title: "Hora óptima", subtitle: "Por sector" },
  { id: "timezone-notifier", title: "Notificaciones", subtitle: "22h–8h silencio" },
  { id: "timezone-report", title: "Analytics", subtitle: "UTC + local" },
  { id: "timezone-calendar", title: "Calendario", subtitle: "Editorial" },
  { id: "timezone-audit", title: "Auditoría", subtitle: "Histórico" },
];

export default function TimezoneDashboard() {
  const [sector, setSector] = useState("ecommerce");
  const [brand, setBrand] = useState("Mi tienda");
  const [countryCode, setCountryCode] = useState("ES");
  const [preferredTimezone, setPreferredTimezone] = useState("Europe/Madrid");
  const [referenceTimestamp, setReferenceTimestamp] = useState("2026-05-09T15:00:00Z");
  const [metricsBrief, setMetricsBrief] = useState("Campaña email Black Friday");
  const [busyId, setBusyId] = useState<TimezoneLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<TimezoneLibraryAgentId, TimezoneOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      sector,
      brand,
      countryCode: countryCode.trim() || undefined,
      preferredTimezone: preferredTimezone.trim() || undefined,
      referenceTimestamp: referenceTimestamp.trim() || undefined,
      metricsBrief: metricsBrief.trim() || undefined,
      metadata: { program: "timezone_v1" },
    }),
    [brand, countryCode, metricsBrief, preferredTimezone, referenceTimestamp, sector],
  );

  const runAgent = useCallback(
    async (agentId: TimezoneLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/timezone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input: payloadBase }),
        });
        const data = (await res.json()) as { result?: TimezoneOutput; error?: string };
        if (!res.ok) throw new Error(data.error ?? "request_failed");
        if (!data.result) throw new Error("sin resultado");
        setOutputs((prev) => ({ ...prev, [agentId]: data.result! }));
      } catch (e: unknown) {
        setStatus(e instanceof Error ? e.message : "Error");
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
          Multi-timezone
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
          Marca / cuenta
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          País (ISO-2)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          Zona IANA
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            placeholder="Europe/Madrid"
            value={preferredTimezone}
            onChange={(e) => setPreferredTimezone(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Timestamp referencia (ISO)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={referenceTimestamp}
            onChange={(e) => setReferenceTimestamp(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Contexto
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={metricsBrief}
            onChange={(e) => setMetricsBrief(e.target.value)}
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
              {out?.highlights?.length ? (
                <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto text-xs text-zinc-300">
                  {out.highlights.slice(0, 6).map((h, idx) => (
                    <li key={idx} className="rounded border border-zinc-800 bg-zinc-950/50 p-1.5">
                      {h.length > 160 ? `${h.slice(0, 160)}…` : h}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Highlights tras generar.</p>
              )}
              {out?.metrics?.length ? (
                <div className="flex flex-wrap gap-1">
                  {out.metrics.slice(0, 8).map((m, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border px-2 py-0.5 text-[10px]"
                      style={{ borderColor: `${accent}66`, color: accent }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Métricas tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
