"use client";

import { useCallback, useEffect, useState } from "react";
import {
  NelvyonDsBadge,
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
} from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { dialerAdvancedApi } from "@/features/dialer-advanced/api";

type DialerTab = "click" | "power" | "a2p";
type PowerMode = "sequential" | "parallel" | "voicemail";

interface CallRecord {
  id: string;
  to: string;
  message: string;
  callSid: string | null;
  status: "initiated" | "failed";
  contactId: string | null;
  createdAt: string;
}

interface DialerStatus {
  dialer_configured: boolean;
  from_number: string | null;
  calls: CallRecord[];
}

function CallModal({ onClose, onCalled }: { onClose: () => void; onCalled: () => void }) {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim()) { setError("El teléfono es obligatorio"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/dialer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), message: message.trim() || undefined }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Error al iniciar llamada");
      onCalled();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nueva llamada</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Teléfono destino *</label>
            <input
              type="tel"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="+34612345678"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted-foreground">Formato internacional: +34612345678</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Mensaje de voz (opcional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Hola, te llamamos desde..."
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Llamando…" : "Iniciar llamada"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SaasDialerPage() {
  const [tab, setTab] = useState<DialerTab>("click");
  const [data, setData] = useState<DialerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCall, setShowCall] = useState(false);
  const [powerQueue, setPowerQueue] = useState("");
  const [powerBusy, setPowerBusy] = useState(false);
  const [powerMode, setPowerMode] = useState<PowerMode>("sequential");
  const [parallelLimit, setParallelLimit] = useState(3);
  const [voicemailUrl, setVoicemailUrl] = useState("");
  const [vmDropNumber, setVmDropNumber] = useState("");
  const [vmBusy, setVmBusy] = useState(false);
  const [a2pRegs, setA2pRegs] = useState<Array<{ id: string; businessName: string; status: string }>>([]);
  const [a2pName, setA2pName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, a2pRes] = await Promise.all([
        fetch("/api/saas/dialer?limit=50"),
        fetch("/api/saas/dialer/a2p"),
      ]);
      if (res.ok) setData((await res.json()) as DialerStatus);
      if (a2pRes.ok) {
        const d = (await a2pRes.json()) as { registrations: Array<{ id: string; businessName: string; status: string }> };
        setA2pRegs(d.registrations ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function runPowerDial() {
    const phones = powerQueue.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (!phones.length) return;
    setPowerBusy(true);
    try {
      const queue = phones.map((phone) => ({
        phone,
        use_voicemail: Boolean(voicemailUrl.trim()),
      }));
      if (powerMode === "parallel") {
        await dialerAdvancedApi.parallelDial({
          client_id: "saas-tenant",
          queue,
          parallel_limit: Math.min(10, Math.max(1, parallelLimit)),
          voicemail_url: voicemailUrl.trim() || null,
        });
      } else {
        await dialerAdvancedApi.powerDial({
          client_id: "saas-tenant",
          queue,
          max_calls: phones.length,
          voicemail_url: voicemailUrl.trim() || null,
        });
      }
      void load();
    } finally {
      setPowerBusy(false);
    }
  }

  async function runVoicemailDrop() {
    if (!voicemailUrl.trim() || !vmDropNumber.trim()) return;
    setVmBusy(true);
    try {
      await dialerAdvancedApi.voicemailDrop({
        to_number: vmDropNumber.trim(),
        voicemail_url: voicemailUrl.trim(),
      });
      void load();
    } finally {
      setVmBusy(false);
    }
  }

  async function createA2pDraft() {
    if (!a2pName.trim()) return;
    await fetch("/api/saas/dialer/a2p", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName: a2pName.trim() }),
    });
    setA2pName("");
    void load();
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="dialer" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader
            title="Dialer Enterprise"
            subtitle="Click-to-call, power dial, parallel dial y registro A2P 10DLC"
          />
          {tab === "click" && (
            <NelvyonDsButton onClick={() => setShowCall(true)} disabled={!data?.dialer_configured}>
              + Nueva llamada
            </NelvyonDsButton>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {([
            ["click", "Click-to-call"],
            ["power", "Power / Parallel"],
            ["a2p", "A2P 10DLC"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-1.5 text-sm ${tab === id ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "power" && (
          <NelvyonDsCard className="p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {([
                ["sequential", "Power dial"],
                ["parallel", "Parallel dial"],
                ["voicemail", "Voicemail drop"],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPowerMode(id)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${powerMode === id ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {powerMode !== "voicemail" ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {powerMode === "parallel"
                    ? `Hasta ${parallelLimit} llamadas simultáneas vía Twilio.`
                    : "Un teléfono por línea — power dial secuencial vía Twilio."}
                </p>
                {powerMode === "parallel" && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    Líneas paralelas
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={parallelLimit}
                      onChange={(e) => setParallelLimit(Number(e.target.value))}
                      className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-sm"
                    />
                  </label>
                )}
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="URL audio voicemail (opcional)"
                  value={voicemailUrl}
                  onChange={(e) => setVoicemailUrl(e.target.value)}
                />
                <textarea
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono min-h-[120px]"
                  placeholder={"+34612345678\n+34698765432"}
                  value={powerQueue}
                  onChange={(e) => setPowerQueue(e.target.value)}
                />
                <NelvyonDsButton disabled={powerBusy || !data?.dialer_configured} onClick={() => void runPowerDial()}>
                  {powerBusy ? "Marcando…" : powerMode === "parallel" ? "Iniciar parallel dial" : "Iniciar power dial"}
                </NelvyonDsButton>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Deja un mensaje de voz en un número sin contestar la llamada.</p>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="URL del audio MP3/WAV"
                  value={voicemailUrl}
                  onChange={(e) => setVoicemailUrl(e.target.value)}
                />
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="+34612345678"
                  value={vmDropNumber}
                  onChange={(e) => setVmDropNumber(e.target.value)}
                />
                <NelvyonDsButton disabled={vmBusy || !data?.dialer_configured} onClick={() => void runVoicemailDrop()}>
                  {vmBusy ? "Enviando…" : "Enviar voicemail drop"}
                </NelvyonDsButton>
              </>
            )}
          </NelvyonDsCard>
        )}

        {tab === "a2p" && (
          <NelvyonDsCard className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">Registro A2P 10DLC para SMS masivo en EE.UU.</p>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="Nombre legal del negocio"
                value={a2pName}
                onChange={(e) => setA2pName(e.target.value)}
              />
              <NelvyonDsButton onClick={() => void createA2pDraft()}>Crear borrador</NelvyonDsButton>
            </div>
            <ul className="space-y-2">
              {a2pRegs.map((r) => (
                <li key={r.id} className="rounded-lg border border-border px-3 py-2 text-sm flex justify-between">
                  <span>{r.businessName}</span>
                  <NelvyonDsBadge tone={r.status === "approved" ? "success" : "neutral"}>{r.status}</NelvyonDsBadge>
                </li>
              ))}
            </ul>
          </NelvyonDsCard>
        )}

        {tab === "click" && (
          <>
        {!loading && data && !data.dialer_configured && (
          <NelvyonDsCard className="border-yellow-500/30 bg-yellow-500/5 p-4">
            <p className="font-medium text-yellow-400">⚠️ Dialer no configurado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Configura{" "}
              <code className="rounded bg-muted/50 px-1 text-xs">TWILIO_ACCOUNT_SID</code>{" "}+{" "}
              <code className="rounded bg-muted/50 px-1 text-xs">TWILIO_AUTH_TOKEN</code>{" "}+{" "}
              <code className="rounded bg-muted/50 px-1 text-xs">TWILIO_FROM_NUMBER</code>{" "}
              en las variables de entorno.
            </p>
          </NelvyonDsCard>
        )}

        {!loading && data?.dialer_configured && (
          <NelvyonDsCard className="border-green-500/30 bg-green-500/5 p-4">
            <p className="text-sm text-green-400">
              ✅ Dialer activo — desde{" "}
              <code className="rounded bg-muted/50 px-1 text-xs">{data.from_number}</code>
            </p>
          </NelvyonDsCard>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Iniciadas", value: data?.calls.filter(c => c.status === "initiated").length ?? 0 },
            { label: "Fallidas",  value: data?.calls.filter(c => c.status === "failed").length ?? 0 },
            { label: "Total",     value: data?.calls.length ?? 0 },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/30" />
            ))}
          </div>
        ) : !data?.calls.length ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-5xl">📞</p>
            <p className="mt-4 text-lg font-semibold text-foreground">Sin llamadas</p>
            <p className="mt-2 text-sm text-muted-foreground">Inicia tu primera llamada click-to-call</p>
            {data?.dialer_configured && (
              <NelvyonDsButton className="mt-5" onClick={() => setShowCall(true)}>
                + Nueva llamada
              </NelvyonDsButton>
            )}
          </NelvyonDsCard>
        ) : (
          <div className="flex flex-col gap-2">
            {data.calls.map((c) => (
              <NelvyonDsCard key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-foreground">{c.to}</span>
                      <NelvyonDsBadge tone={c.status === "initiated" ? "success" : "danger"}>
                        {c.status === "initiated" ? "Iniciada" : "Fallida"}
                      </NelvyonDsBadge>
                    </div>
                    {c.message && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{c.message}</p>
                    )}
                    {c.callSid && (
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground/60">{c.callSid}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleString("es-ES")}
                  </span>
                </div>
              </NelvyonDsCard>
            ))}
          </div>
        )}
          </>
        )}
      </div>

      {showCall && <CallModal onClose={() => setShowCall(false)} onCalled={load} />}
    </SaasShellLayout>
  );
}
