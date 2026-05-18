"use client";

import { useCallback, useMemo, useState } from "react";

type SaasB2bLibraryAgentId =
  | "saasb2b-demo"
  | "saasb2b-leadgen"
  | "saasb2b-onboarding"
  | "saasb2b-seo"
  | "saasb2b-social"
  | "saasb2b-email"
  | "saasb2b-reviews"
  | "saasb2b-analytics";

type Row = { id: SaasB2bLibraryAgentId; title: string; subtitle: string };

type SaasB2bOutput = {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
};

const accent = "#38bdf8";

const AGENTS: Row[] = [
  { id: "saasb2b-demo", title: "Demo", subtitle: "Trials" },
  { id: "saasb2b-leadgen", title: "Leads", subtitle: "B2B" },
  { id: "saasb2b-onboarding", title: "Onboard", subtitle: "Paid" },
  { id: "saasb2b-seo", title: "SEO", subtitle: "PLG" },
  { id: "saasb2b-social", title: "Social", subtitle: "LinkedIn" },
  { id: "saasb2b-email", title: "Email", subtitle: "Nurture" },
  { id: "saasb2b-reviews", title: "Reviews", subtitle: "G2" },
  { id: "saasb2b-analytics", title: "Analytics", subtitle: "MRR" },
];

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function SaasB2bDashboard() {
  const [businessName, setBusinessName] = useState("SaaS demo");
  const [servicesText, setServicesText] = useState("PLG, enterprise sales, onboarding");
  const [targetsText, setTargetsText] = useState("SMB, mid-market, enterprise");
  const [busyId, setBusyId] = useState<SaasB2bLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<SaasB2bLibraryAgentId, SaasB2bOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      businessName,
      services: splitCsv(servicesText),
      targets: splitCsv(targetsText),
      metadata: { program: "saasb2b_v1" },
    }),
    [businessName, servicesText, targetsText],
  );

  const runAgent = useCallback(
    async (agentId: SaasB2bLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/saasb2b", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input: payloadBase }),
        });
        const data = (await res.json()) as { result?: SaasB2bOutput; error?: string };
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
          SaaS B2B <span style={{ color: accent }}>×</span> NELVYON
        </h2>
        {status ? <p className="text-sm text-rose-400">{status}</p> : null}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Negocio
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Servicios (coma)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={servicesText}
            onChange={(e) => setServicesText(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Targets (coma)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={targetsText}
            onChange={(e) => setTargetsText(e.target.value)}
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
              {out?.recommendations?.length ? (
                <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto text-xs text-zinc-300">
                  {out.recommendations.slice(0, 6).map((h, idx) => (
                    <li key={idx} className="rounded border border-zinc-800 bg-zinc-950/50 p-1.5">
                      {h.length > 160 ? `${h.slice(0, 160)}…` : h}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Recomendaciones tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
