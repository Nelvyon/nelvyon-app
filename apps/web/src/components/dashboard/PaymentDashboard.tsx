"use client";

import { useCallback, useMemo, useState } from "react";

type PaymentLibraryAgentId =
  | "payment-dunning-sequence"
  | "payment-soft-reminder"
  | "payment-firm-notice"
  | "payment-recovery-offer"
  | "payment-escalation"
  | "payment-winback"
  | "payment-risk-profiler"
  | "payment-legal-notice";

type Row = { id: PaymentLibraryAgentId; title: string; subtitle: string };

type PaymentOutput = {
  agentId: string;
  content: string;
  score: number;
  nextAction: string;
  messages: string[];
};

const accent = "#14b8a6";

const AGENTS: Row[] = [
  { id: "payment-dunning-sequence", title: "Dunning", subtitle: "Secuencia D1–D30" },
  { id: "payment-soft-reminder", title: "Suave", subtitle: "Recordatorio" },
  { id: "payment-firm-notice", title: "Firme", subtitle: "Aviso formal" },
  { id: "payment-recovery-offer", title: "Recuperación", subtitle: "Oferta" },
  { id: "payment-escalation", title: "Escalada", subtitle: "Antes de baja" },
  { id: "payment-winback", title: "Winback", subtitle: "Post-pago" },
  { id: "payment-risk-profiler", title: "Riesgo", subtitle: "Preventivo" },
  { id: "payment-legal-notice", title: "Legal", subtitle: "Aviso deuda" },
];

export default function PaymentDashboard() {
  const [sector, setSector] = useState("saas");
  const [clientName, setClientName] = useState("Cliente demo S.L.");
  const [amountDue, setAmountDue] = useState("490 EUR");
  const [daysPastDue, setDaysPastDue] = useState("12");
  const [previousAttempts, setPreviousAttempts] = useState("2");
  const [planType, setPlanType] = useState("pro anual");
  const [busyId, setBusyId] = useState<PaymentLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<PaymentLibraryAgentId, PaymentOutput>>>({});

  const payloadBase = useMemo(
    () => ({
      sector,
      clientName,
      amountDue,
      daysPastDue: daysPastDue.trim() ? Number(daysPastDue.trim()) : undefined,
      previousAttempts: previousAttempts.trim() ? Number(previousAttempts.trim()) : undefined,
      planType,
    }),
    [amountDue, clientName, daysPastDue, planType, previousAttempts, sector],
  );

  const runAgent = useCallback(
    async (agentId: PaymentLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const input: Record<string, unknown> = {
          sector: payloadBase.sector.trim(),
          clientName: payloadBase.clientName.trim(),
          amountDue: payloadBase.amountDue.trim(),
        };
        if (payloadBase.daysPastDue != null && Number.isFinite(payloadBase.daysPastDue)) {
          input.daysPastDue = payloadBase.daysPastDue;
        }
        if (payloadBase.previousAttempts != null && Number.isFinite(payloadBase.previousAttempts)) {
          input.previousAttempts = payloadBase.previousAttempts;
        }
        if (payloadBase.planType.trim()) input.planType = payloadBase.planType.trim();

        const res = await fetch("/api/os/agents/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input }),
        });
        const data = (await res.json()) as { result?: PaymentOutput; error?: string };
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
          Gestión de impagos automática
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
          Cliente
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Importe adeudado
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={amountDue}
            onChange={(e) => setAmountDue(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Días mora
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={daysPastDue}
            onChange={(e) => setDaysPastDue(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Intentos previos
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={previousAttempts}
            onChange={(e) => setPreviousAttempts(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Plan
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={planType}
            onChange={(e) => setPlanType(e.target.value)}
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
              {out?.nextAction ? (
                <p
                  className="rounded border p-2 text-xs font-medium leading-snug text-zinc-100"
                  style={{ borderColor: `${accent}55`, backgroundColor: `${accent}14` }}
                >
                  {out.nextAction.length > 400 ? `${out.nextAction.slice(0, 400)}…` : out.nextAction}
                </p>
              ) : (
                <p className="text-xs text-zinc-500">Siguiente acción tras generar.</p>
              )}
              {out?.messages?.length ? (
                <ul className="max-h-40 space-y-2 overflow-y-auto text-xs text-zinc-300">
                  {out.messages.slice(0, 8).map((msg, idx) => (
                    <li key={idx} className="rounded border border-zinc-800 bg-zinc-950/50 p-2">
                      {msg.length > 220 ? `${msg.slice(0, 220)}…` : msg}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Mensajes tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
