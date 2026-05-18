"use client";

import { useCallback, useMemo, useState } from "react";

type FiscalBillingLibraryAgentId =
  | "fiscalbilling-detector"
  | "fiscalbilling-vat"
  | "fiscalbilling-invoice"
  | "fiscalbilling-kit-digital"
  | "fiscalbilling-reverse-charge"
  | "fiscalbilling-exempt"
  | "fiscalbilling-report"
  | "fiscalbilling-validator";

type Row = { id: FiscalBillingLibraryAgentId; title: string; subtitle: string };

type FiscalBillingOutput = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

const accent = "#6366f1";

const AGENTS: Row[] = [
  { id: "fiscalbilling-detector", title: "Detector fiscal", subtitle: "País y régimen" },
  { id: "fiscalbilling-vat", title: "IVA / VAT", subtitle: "Tipos por país" },
  { id: "fiscalbilling-invoice", title: "Factura legal", subtitle: "Campos obligatorios" },
  { id: "fiscalbilling-kit-digital", title: "Kit Digital", subtitle: "ES subvenciones" },
  { id: "fiscalbilling-reverse-charge", title: "Reverse charge", subtitle: "B2B UE sin IVA" },
  { id: "fiscalbilling-exempt", title: "Exenciones", subtitle: "ONG, export…" },
  { id: "fiscalbilling-report", title: "Informe mensual", subtitle: "Por país" },
  { id: "fiscalbilling-validator", title: "Validador ID", subtitle: "NIF / VAT / RFC / CNPJ" },
];

export default function FiscalBillingDashboard() {
  const [sector, setSector] = useState("saas");
  const [brand, setBrand] = useState("Mi empresa SL");
  const [countryCode, setCountryCode] = useState("ES");
  const [taxId, setTaxId] = useState("B12345678");
  const [isB2B, setIsB2B] = useState(false);
  const [isEuCrossBorder, setIsEuCrossBorder] = useState(false);
  const [metricsBrief, setMetricsBrief] = useState("Suscripción Pro mensual IVA general");
  const [busyId, setBusyId] = useState<FiscalBillingLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<FiscalBillingLibraryAgentId, FiscalBillingOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      sector,
      brand,
      countryCode: countryCode.trim() || undefined,
      taxId: taxId.trim() || undefined,
      isB2B,
      isEuCrossBorder,
      metricsBrief: metricsBrief.trim() || undefined,
      metadata: { program: "fiscalbilling_v1" },
    }),
    [brand, countryCode, isB2B, isEuCrossBorder, metricsBrief, sector, taxId],
  );

  const runAgent = useCallback(
    async (agentId: FiscalBillingLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/fiscalbilling", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input: payloadBase }),
        });
        const data = (await res.json()) as { result?: FiscalBillingOutput; error?: string };
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
          Facturación fiscal por país
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
          Marca / razón social
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          País fiscal (ISO-2)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          ID fiscal (NIF / VAT / RFC…)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="flex items-center gap-2">
            <input type="checkbox" checked={isB2B} onChange={(e) => setIsB2B(e.target.checked)} />
            Operación B2B
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="flex items-center gap-2">
            <input type="checkbox" checked={isEuCrossBorder} onChange={(e) => setIsEuCrossBorder(e.target.checked)} />
            Cruce UE (orientativo)
          </span>
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
