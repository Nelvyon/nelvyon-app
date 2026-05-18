"use client";

import { useCallback, useMemo, useState } from "react";

type VoiceV9LibraryAgentId =
  | "voicev9-whatsapp"
  | "voicev9-sms"
  | "voicev9-video"
  | "voicev9-continuidad"
  | "voicev9-documentos"
  | "voicev9-notificaciones"
  | "voicev9-optin"
  | "voicev9-metricas";

type Row = { id: VoiceV9LibraryAgentId; title: string; subtitle: string };

type VoiceV9Output = {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
};

const accent = "#4ade80";

const AGENTS: Row[] = [
  { id: "voicev9-whatsapp", title: "WhatsApp", subtitle: "Business API" },
  { id: "voicev9-sms", title: "SMS", subtitle: "Seguimiento post-conversación" },
  { id: "voicev9-video", title: "Vídeo", subtitle: "Avatar HeyGen v3" },
  { id: "voicev9-continuidad", title: "Continuidad", subtitle: "Contexto compartido" },
  { id: "voicev9-documentos", title: "Documentos", subtitle: "WA tras llamada" },
  { id: "voicev9-notificaciones", title: "Notificaciones", subtitle: "Canal preferido" },
  { id: "voicev9-optin", title: "Opt-in", subtitle: "GDPR por canal" },
  { id: "voicev9-metricas", title: "Métricas", subtitle: "Entrega y apertura" },
];

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function VoiceV9Dashboard() {
  const [businessName, setBusinessName] = useState("Ventas omnicanal voz + digital");
  const [servicesText, setServicesText] = useState("Meta WA, Twilio SMS, HeyGen, WebRTC");
  const [targetsText, setTargetsText] = useState("B2C retail, UE GDPR, LATAM");
  const [busyId, setBusyId] = useState<VoiceV9LibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<VoiceV9LibraryAgentId, VoiceV9Output>>>({});

  const payloadBase = useMemo(
    () => ({
      businessName,
      services: splitCsv(servicesText),
      targets: splitCsv(targetsText),
      metadata: { program: "voicev9_v1" },
    }),
    [businessName, servicesText, targetsText],
  );

  const runAgent = useCallback(
    async (agentId: VoiceV9LibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        const res = await fetch("/api/os/agents/voicev9", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, input: payloadBase }),
        });
        const data = (await res.json()) as { result?: VoiceV9Output; error?: string };
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
          Voice agent v9 — WhatsApp + SMS + vídeo <span style={{ color: accent }}>×</span> NELVYON
        </h2>
        {status ? <p className="text-sm text-rose-400">{status}</p> : null}
      </div>

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
          Integraciones (coma)
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={servicesText}
            onChange={(e) => setServicesText(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Mercados / targets (coma)
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
