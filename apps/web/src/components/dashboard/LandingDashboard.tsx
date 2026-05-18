"use client";

import { useCallback, useMemo, useState } from "react";

type LandingAgentId =
  | "landing-hero-copy"
  | "landing-benefits-section"
  | "landing-social-proof"
  | "landing-faq-builder"
  | "landing-urgency"
  | "landing-mobile-first"
  | "landing-ab-variant"
  | "landing-conversion-audit";

type Row = { id: LandingAgentId; title: string; subtitle: string };

type LandingOutput = {
  agentId: string;
  content: string;
  score: number;
  sections: string[];
  ctaVariants: string[];
};

const accent = "#14b8a6";

const AGENTS: Row[] = [
  { id: "landing-hero-copy", title: "Hero", subtitle: "Headline + CTA" },
  { id: "landing-benefits-section", title: "Beneficios", subtitle: "F.A.B." },
  { id: "landing-social-proof", title: "Prueba social", subtitle: "Testimonios" },
  { id: "landing-faq-builder", title: "FAQ", subtitle: "Objeciones + SEO" },
  { id: "landing-urgency", title: "Urgencia", subtitle: "Ética" },
  { id: "landing-mobile-first", title: "Mobile-first", subtitle: "Estructura" },
  { id: "landing-ab-variant", title: "A/B Hero", subtitle: "3 variantes" },
  { id: "landing-conversion-audit", title: "Auditoría", subtitle: "CRO" },
];

export default function LandingDashboard() {
  const [sector, setSector] = useState("saas");
  const [brand, setBrand] = useState("Marca demo");
  const [campaignGoal, setCampaignGoal] = useState("Captar leads cualificados para demo");
  const [targetAudience, setTargetAudience] = useState("CMOs PYMES tech");
  const [product, setProduct] = useState("Plataforma analytics");
  const [tone, setTone] = useState("profesional aspiracional");
  const [cta, setCta] = useState("Agendar demo");
  const [busyId, setBusyId] = useState<LandingAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<LandingAgentId, LandingOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      sector,
      brand,
      campaignGoal,
      targetAudience,
      product,
      tone,
      cta,
    }),
    [brand, campaignGoal, cta, product, sector, targetAudience, tone],
  );

  const runAgent = useCallback(
    async (agentId: LandingAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/landing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            input: {
              sector: payloadBase.sector.trim(),
              brand: payloadBase.brand.trim(),
              campaignGoal: payloadBase.campaignGoal.trim(),
              targetAudience: payloadBase.targetAudience.trim(),
              product: payloadBase.product.trim(),
              tone: payloadBase.tone.trim(),
              cta: payloadBase.cta.trim(),
            },
          }),
        });
        const data = (await res.json()) as { result?: LandingOutput; error?: string };
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
          Landing page builder
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
          Objetivo campaña
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={campaignGoal}
            onChange={(e) => setCampaignGoal(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          Producto
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tono
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          CTA
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={cta}
            onChange={(e) => setCta(e.target.value)}
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
              {out?.sections?.length ? (
                <div className="flex flex-wrap gap-1">
                  {out.sections.slice(0, 8).map((s, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border px-2 py-0.5 text-[10px] text-zinc-200"
                      style={{ borderColor: `${accent}66`, color: accent }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Secciones tras generar.</p>
              )}
              {out?.ctaVariants?.length ? (
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-zinc-300">
                  {out.ctaVariants.slice(0, 6).map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Variantes CTA tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
