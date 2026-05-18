"use client";

import { useCallback, useMemo, useState } from "react";

type SocialAgentId =
  | "social-content-calendar"
  | "social-copywriter"
  | "social-hashtag-strategist"
  | "social-engagement-hooks"
  | "social-storytelling"
  | "social-crisis-response"
  | "social-competitor-monitor"
  | "social-campaign-launch"
  | "social-analytics-narrator";

type Row = { id: SocialAgentId; title: string; subtitle: string };

type SocialOutput = {
  agentId: string;
  content: string;
  score: number;
  posts: string[];
  hashtags: string[];
};

const accent = "#14b8a6";

const AGENTS: Row[] = [
  { id: "social-content-calendar", title: "Calendario", subtitle: "Editorial mensual" },
  { id: "social-copywriter", title: "Copy", subtitle: "Por plataforma" },
  { id: "social-hashtag-strategist", title: "Hashtags", subtitle: "Estrategia" },
  { id: "social-engagement-hooks", title: "Hooks", subtitle: "Primeras líneas" },
  { id: "social-storytelling", title: "Story", subtitle: "Series/hilos" },
  { id: "social-crisis-response", title: "Crisis", subtitle: "Respuesta RRSS" },
  { id: "social-competitor-monitor", title: "Competencia", subtitle: "Oportunidades" },
  { id: "social-campaign-launch", title: "Lanzamiento", subtitle: "Multicanal" },
  { id: "social-analytics-narrator", title: "Analytics", subtitle: "Narrativa KPIs" },
];

export default function SocialDashboard() {
  const [sector, setSector] = useState("retail");
  const [brand, setBrand] = useState("Marca demo");
  const [targetAudience, setTargetAudience] = useState("Gen Z compradores conscientes");
  const [campaignGoal, setCampaignGoal] = useState("Awareness + comunidad");
  const [tone, setTone] = useState("auténtico y energético");
  const [busyId, setBusyId] = useState<SocialAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<SocialAgentId, SocialOutput>>>({});

  const platforms = useMemo(() => ["instagram", "tiktok", "linkedin"], []);

  const runAgent = useCallback(
    async (agentId: SocialAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/social", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            input: {
              sector: sector.trim(),
              brand: brand.trim(),
              platforms,
              targetAudience: targetAudience.trim(),
              campaignGoal: campaignGoal.trim(),
              tone: tone.trim(),
            },
          }),
        });
        const data = (await res.json()) as { result?: SocialOutput; error?: string };
        if (!res.ok) throw new Error(data.error ?? "request_failed");
        if (!data.result) throw new Error("sin resultado");
        setOutputs((prev) => ({ ...prev, [agentId]: data.result! }));
      } catch {
        setStatus(`Error al ejecutar ${agentId}`);
      } finally {
        setBusyId(null);
      }
    },
    [brand, campaignGoal, platforms, sector, targetAudience, tone],
  );

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold" style={{ color: accent }}>
          Social media management
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
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-1">
          Audiencia
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Objetivo
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={campaignGoal}
            onChange={(e) => setCampaignGoal(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Tono
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              {out?.posts?.length ? (
                <ul className="mt-1 max-h-40 space-y-2 overflow-y-auto text-xs text-zinc-300">
                  {out.posts.slice(0, 8).map((p, idx) => (
                    <li key={idx} className="rounded border border-zinc-800 bg-zinc-950/50 p-2">
                      {p.length > 220 ? `${p.slice(0, 220)}…` : p}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Posts tras generar.</p>
              )}
              {out?.hashtags?.length ? (
                <div className="flex flex-wrap gap-1">
                  {out.hashtags.slice(0, 12).map((h, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border px-2 py-0.5 text-[10px] text-zinc-200"
                      style={{ borderColor: `${accent}66`, color: accent }}
                    >
                      {h.startsWith("#") ? h : `#${h}`}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Hashtags tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
