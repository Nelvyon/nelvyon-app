"use client";

import { useCallback, useMemo, useState } from "react";

type VoiceAgentLibraryAgentId =
  | "voiceagent-caller"
  | "voiceagent-transcriber"
  | "voiceagent-summary"
  | "voiceagent-qualifier"
  | "voiceagent-followup"
  | "voiceagent-script"
  | "voiceagent-analytics"
  | "voiceagent-compliance";

type Row = { id: VoiceAgentLibraryAgentId; title: string; subtitle: string };

type VoiceAgentOutput = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

const accent = "#ec4899";

const AGENTS: Row[] = [
  { id: "voiceagent-caller", title: "Caller", subtitle: "Saliente" },
  { id: "voiceagent-transcriber", title: "Transcribe", subtitle: "Diarization" },
  { id: "voiceagent-summary", title: "Resumen", subtitle: "Action items" },
  { id: "voiceagent-qualifier", title: "Qualifier", subtitle: "Intent · fit" },
  { id: "voiceagent-followup", title: "Follow-up", subtitle: "Email · CRM" },
  { id: "voiceagent-script", title: "Script", subtitle: "Por sector" },
  { id: "voiceagent-analytics", title: "Analytics", subtitle: "Sentiment" },
  { id: "voiceagent-compliance", title: "Compliance", subtitle: "GDPR" },
];

export default function VoiceAgentDashboard() {
  const [sector, setSector] = useState("saas");
  const [brand, setBrand] = useState("NELVYON voice");
  const [voiceBrief, setVoiceBrief] = useState("Outbound qualificación B2B · ES");
  const [metricsBrief, setMetricsBrief] = useState("Duración 3-7 min · conv · sentiment");
  const [busyId, setBusyId] = useState<VoiceAgentLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<VoiceAgentLibraryAgentId, VoiceAgentOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      sector,
      brand,
      voiceBrief: voiceBrief.trim() || undefined,
      metricsBrief: metricsBrief.trim() || undefined,
      metadata: { program: "voiceagent_v1" },
    }),
    [brand, metricsBrief, sector, voiceBrief],
  );

  const runAgent = useCallback(
    async (agentId: VoiceAgentLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/voiceagent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input: payloadBase }),
        });
        const data = (await res.json()) as { result?: VoiceAgentOutput; error?: string };
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
        <h2 className="text-lg font-semibold text-zinc-100">
          Voice agent <span style={{ color: accent }}>×</span> NELVYON
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
          Marca / campaña
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Voz / objetivo
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={voiceBrief}
            onChange={(e) => setVoiceBrief(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Métricas / llamadas
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
                    className="rounded-full px-2 py-0.5 text-xs font-bold text-zinc-100"
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
                className="min-h-[44px] rounded px-3 py-2 text-sm font-semibold text-zinc-100 disabled:opacity-50 md:text-base"
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
                      style={{ borderColor: `${accent}66`, color: "#f9a8d4" }}
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
