"use client";

import { useCallback, useMemo, useState } from "react";

type EmailMarketingAgentId =
  | "email-subject-line-optimizer"
  | "email-welcome-sequence"
  | "email-nurture-sequence"
  | "email-reactivation"
  | "email-promotional-campaign"
  | "email-abandoned-cart"
  | "email-newsletter-builder"
  | "email-personalization-engine"
  | "email-deliverability-advisor";

type Row = { id: EmailMarketingAgentId; title: string; subtitle: string };

type EmailMarketingOutput = {
  agentId: string;
  content: string;
  score: number;
  subjectLines: string[];
  previewTexts: string[];
};

const accent = "#14b8a6";

const AGENTS: Row[] = [
  { id: "email-subject-line-optimizer", title: "Subject lines", subtitle: "10 variantes A/B" },
  { id: "email-welcome-sequence", title: "Bienvenida", subtitle: "5 emails" },
  { id: "email-nurture-sequence", title: "Nurturing", subtitle: "7 emails funnel" },
  { id: "email-reactivation", title: "Reactivación", subtitle: "+90 días" },
  { id: "email-promotional-campaign", title: "Promo", subtitle: "Alta conversión" },
  { id: "email-abandoned-cart", title: "Carrito", subtitle: "3 emails" },
  { id: "email-newsletter-builder", title: "Newsletter", subtitle: "Editorial" },
  { id: "email-personalization-engine", title: "Personalización", subtitle: "Por segmento" },
  { id: "email-deliverability-advisor", title: "Deliverability", subtitle: "Anti-spam" },
];

export default function EmailMarketingDashboard() {
  const [sector, setSector] = useState("ecommerce");
  const [brand, setBrand] = useState("Marca demo");
  const [targetAudience, setTargetAudience] = useState("Compradores recurrentes 25–45");
  const [campaignGoal, setCampaignGoal] = useState("Aumentar apertura y clics en campaña mensual");
  const [productOrService, setProductOrService] = useState("Suscripción premium");
  const [tone, setTone] = useState("directo y cercano");
  const [busyId, setBusyId] = useState<EmailMarketingAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<EmailMarketingAgentId, EmailMarketingOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      sector,
      brand,
      targetAudience,
      campaignGoal,
      productOrService,
      tone,
    }),
    [brand, campaignGoal, productOrService, sector, targetAudience, tone],
  );

  const runAgent = useCallback(
    async (agentId: EmailMarketingAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/emailmarketing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            input: {
              ...payloadBase,
              sector: payloadBase.sector.trim(),
              brand: payloadBase.brand.trim(),
              targetAudience: payloadBase.targetAudience.trim(),
              campaignGoal: payloadBase.campaignGoal.trim(),
              productOrService: payloadBase.productOrService.trim(),
              tone: payloadBase.tone.trim(),
            },
          }),
        });
        const data = (await res.json()) as { result?: EmailMarketingOutput; error?: string };
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
          Email marketing masivo
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
        <label className="flex flex-col gap-1 text-sm">
          Producto/servicio
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={productOrService}
            onChange={(e) => setProductOrService(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
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
              {out?.subjectLines?.length ? (
                <ul className="mt-1 space-y-1 text-xs text-zinc-300">
                  {out.subjectLines.slice(0, 8).map((s, idx) => (
                    <li key={idx} className="border-l-2 pl-2" style={{ borderColor: accent }}>
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Asuntos tras generar.</p>
              )}
              {out?.previewTexts?.length ? (
                <div className="flex flex-wrap gap-1">
                  {out.previewTexts.slice(0, 8).map((t, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border px-2 py-0.5 text-[10px] text-zinc-200"
                      style={{ borderColor: `${accent}66`, color: accent }}
                    >
                      {t.length > 48 ? `${t.slice(0, 48)}…` : t}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Preheaders tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
