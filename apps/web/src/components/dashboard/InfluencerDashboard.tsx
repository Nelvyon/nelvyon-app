"use client";

import { useCallback, useMemo, useState } from "react";

type ProgramMode = "reach" | "virtual";

type InfluencerReachAgentId =
  | "influencer-discovery"
  | "influencer-fit-scorer"
  | "influencer-outreach-crafter"
  | "influencer-brief-generator"
  | "influencer-contract-terms"
  | "influencer-roi-projector"
  | "influencer-content-calendar"
  | "influencer-campaign-report";

type InfluencerVirtualAgentId =
  | "influencer-identidad"
  | "influencer-contenido"
  | "influencer-avatar"
  | "influencer-voz"
  | "influencer-calendario"
  | "influencer-comunidad"
  | "influencer-monetizacion"
  | "influencer-analytics";

type ReachRow = { id: InfluencerReachAgentId; title: string; subtitle: string };
type VirtualRow = { id: InfluencerVirtualAgentId; title: string; subtitle: string };

type ReachOutput = {
  agentId: string;
  content: string;
  score: number;
  recommendations: string[];
};

type VirtualOutput = {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
};

const accentReach = "#14b8a6";
const accentVirtual = "#a78bfa";

const REACH_AGENTS: ReachRow[] = [
  { id: "influencer-discovery", title: "Discovery", subtitle: "Perfiles ideales" },
  { id: "influencer-fit-scorer", title: "Fit score", subtitle: "Alineación 0–100" },
  { id: "influencer-outreach-crafter", title: "Outreach", subtitle: "Propuesta DM/email" },
  { id: "influencer-brief-generator", title: "Brief", subtitle: "Creativo creator" },
  { id: "influencer-contract-terms", title: "Términos", subtitle: "Acuerdo sugerido" },
  { id: "influencer-roi-projector", title: "ROI", subtitle: "Proyección campaña" },
  { id: "influencer-content-calendar", title: "Calendario", subtitle: "Publicaciones" },
  { id: "influencer-campaign-report", title: "Informe", subtitle: "Resultados" },
];

const VIRTUAL_AGENTS: VirtualRow[] = [
  { id: "influencer-identidad", title: "Identidad", subtitle: "Personaje IA coherente" },
  { id: "influencer-contenido", title: "Contenido", subtitle: "IG / TikTok / YT / X" },
  { id: "influencer-avatar", title: "Avatar", subtitle: "HeyGen v3 + Flux Ultra" },
  { id: "influencer-voz", title: "Voz", subtitle: "ElevenLabs consistente" },
  { id: "influencer-calendario", title: "Calendario", subtitle: "Editorial automático" },
  { id: "influencer-comunidad", title: "Comunidad", subtitle: "Comentarios y DMs" },
  { id: "influencer-monetizacion", title: "Monetización", subtitle: "Afiliados y sponsors" },
  { id: "influencer-analytics", title: "Analytics", subtitle: "Engagement y crecimiento" },
];

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function InfluencerDashboard() {
  const [mode, setMode] = useState<ProgramMode>("reach");
  const accent = mode === "reach" ? accentReach : accentVirtual;

  const [sector, setSector] = useState("beauty");
  const [brand, setBrand] = useState("Marca demo");
  const [targetAudience, setTargetAudience] = useState("Mujeres 22–38 interés skincare");
  const [budget, setBudget] = useState("12k EUR");

  const [businessName, setBusinessName] = useState("Influencer virtual — marca demo");
  const [servicesText, setServicesText] = useState("HeyGen, Flux, ElevenLabs, calendario IA");
  const [targetsText, setTargetsText] = useState("Instagram, TikTok, YouTube Shorts");

  const [busyReach, setBusyReach] = useState<InfluencerReachAgentId | null>(null);
  const [busyVirtual, setBusyVirtual] = useState<InfluencerVirtualAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [reachOutputs, setReachOutputs] = useState<Partial<Record<InfluencerReachAgentId, ReachOutput>>>({});
  const [virtualOutputs, setVirtualOutputs] = useState<Partial<Record<InfluencerVirtualAgentId, VirtualOutput>>>({});

  const platforms = useMemo(() => ["instagram", "tiktok"], []);

  const reachPayload = useMemo(
    () => ({
      sector: sector.trim(),
      brand: brand.trim(),
      targetAudience: targetAudience.trim(),
      budget: budget.trim(),
      platforms,
    }),
    [brand, budget, platforms, sector, targetAudience],
  );

  const virtualPayloadBase = useMemo(
    () => ({
      businessName,
      services: splitCsv(servicesText),
      targets: splitCsv(targetsText),
      metadata: { program: "influencer_v1" as const },
    }),
    [businessName, servicesText, targetsText],
  );

  const runReachAgent = useCallback(
    async (agentId: InfluencerReachAgentId): Promise<void> => {
      setBusyReach(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/influencer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            agentId,
            input: reachPayload,
          }),
        });
        const data = (await res.json()) as { result?: ReachOutput; error?: string };
        if (!res.ok) throw new Error(data.error ?? "request_failed");
        if (!data.result) throw new Error("sin resultado");
        setReachOutputs((prev) => ({ ...prev, [agentId]: data.result! }));
      } catch (e: unknown) {
        setStatus(e instanceof Error ? e.message : `Error al ejecutar ${agentId}`);
      } finally {
        setBusyReach(null);
      }
    },
    [reachPayload],
  );

  const runVirtualAgent = useCallback(
    async (agentId: InfluencerVirtualAgentId): Promise<void> => {
      setBusyVirtual(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/influencer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            agentId,
            input: virtualPayloadBase,
          }),
        });
        const data = (await res.json()) as { result?: VirtualOutput; error?: string };
        if (!res.ok) throw new Error(data.error ?? "request_failed");
        if (!data.result) throw new Error("sin resultado");
        setVirtualOutputs((prev) => ({ ...prev, [agentId]: data.result! }));
      } catch (e: unknown) {
        setStatus(e instanceof Error ? e.message : `Error al ejecutar ${agentId}`);
      } finally {
        setBusyVirtual(null);
      }
    },
    [virtualPayloadBase],
  );

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold" style={{ color: accent }}>
          Influencer OS
        </h2>
        {status ? <p className="text-sm text-rose-400">{status}</p> : null}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded px-3 py-1.5 text-xs font-semibold ${
            mode === "reach" ? "text-zinc-950" : "border border-zinc-700 text-zinc-300"
          }`}
          style={mode === "reach" ? { backgroundColor: accentReach } : undefined}
          onClick={() => setMode("reach")}
        >
          Marketing REACH
        </button>
        <button
          type="button"
          className={`rounded px-3 py-1.5 text-xs font-semibold ${
            mode === "virtual" ? "text-zinc-950" : "border border-zinc-700 text-zinc-300"
          }`}
          style={mode === "virtual" ? { backgroundColor: accentVirtual } : undefined}
          onClick={() => setMode("virtual")}
        >
          Influencer virtual IA v1
        </button>
      </div>

      {mode === "reach" ? (
        <>
          <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
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
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              Audiencia objetivo
              <input
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              Presupuesto (opcional)
              <input
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {REACH_AGENTS.map((a) => {
              const out = reachOutputs[a.id];
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
                    disabled={busyReach !== null}
                    className="min-h-[44px] rounded px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50 md:text-base"
                    style={{ backgroundColor: accent }}
                    onClick={() => void runReachAgent(a.id)}
                  >
                    {busyReach === a.id ? "Ejecutando…" : "Ejecutar"}
                  </button>
                  {out?.content ? (
                    <p className="line-clamp-4 text-xs text-zinc-400">{out.content}</p>
                  ) : null}
                  {out?.recommendations?.length ? (
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-zinc-300">
                      {out.recommendations.slice(0, 6).map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-zinc-500">Recomendaciones tras ejecutar.</p>
                  )}
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
              Organización / producto
              <input
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
              Stack / herramientas (coma)
              <input
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
                value={servicesText}
                onChange={(e) => setServicesText(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
              Plataformas / audiencia (coma)
              <input
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
                value={targetsText}
                onChange={(e) => setTargetsText(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {VIRTUAL_AGENTS.map((a) => {
              const out = virtualOutputs[a.id];
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
                    disabled={busyVirtual !== null}
                    className="min-h-[44px] rounded px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50 md:text-base"
                    style={{ backgroundColor: accent }}
                    onClick={() => void runVirtualAgent(a.id)}
                  >
                    {busyVirtual === a.id ? "Ejecutando…" : "Ejecutar"}
                  </button>
                  {out?.result ? (
                    <p className="line-clamp-4 text-xs text-zinc-400">{out.result}</p>
                  ) : null}
                  {out?.recommendations?.length ? (
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-zinc-300">
                      {out.recommendations.slice(0, 6).map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-zinc-500">Recomendaciones tras ejecutar.</p>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
