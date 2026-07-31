"use client";

import { useCallback, useEffect, useState } from "react";

import {
  NelvyonDsBadge,
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
} from "@/design-system/components";
import { KpiTile } from "@/features/saas-shell/components/SaasDashboardWidgets";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SmsLogEntry {
  id: string;
  to: string;
  body: string;
  twilioSid: string | null;
  status: "sent" | "failed" | "queued";
  createdAt: string;
}

const MAX_SMS = 160;

// ─── Send single SMS modal ────────────────────────────────────────────────────

function SendSmsModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim() || !msg.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), message: msg.trim() }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok || j.ok === false) throw new Error(j.error ?? "Error al enviar");
      setDone(true);
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Enviar SMS</h2>
        {done ? (
          <div className="py-8 text-center">
            <p className="text-4xl">✅</p>
            <p className="mt-3 font-medium text-foreground">SMS enviado</p>
            <NelvyonDsButton className="mt-5" onClick={onClose}>Cerrar</NelvyonDsButton>
          </div>
        ) : (
          <form onSubmit={send} className="space-y-4">
            {error && <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Número de destino *</label>
              <input
                type="tel"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="+34 600 000 000"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>Mensaje *</span>
                <span className={msg.length > MAX_SMS ? "text-destructive" : ""}>{msg.length}/{MAX_SMS}</span>
              </label>
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows={4}
                placeholder="Escribe tu mensaje aquí…"
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
              <NelvyonDsButton type="submit" disabled={sending || msg.length > MAX_SMS} className="flex-1">
                {sending ? "Enviando…" : "Enviar SMS"}
              </NelvyonDsButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SaasSmsPage() {
  const [messages, setMessages] = useState<SmsLogEntry[]>([]);
  const [fromNumber, setFromNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSend, setShowSend] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/sms?limit=50");
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Error ${res.status} al cargar SMS`);
      }
      const data = (await res.json()) as {
        sms_configured?: boolean;
        from_number?: string | null;
        messages?: SmsLogEntry[];
      };
      setConfigured(data.sms_configured ?? false);
      setFromNumber(data.from_number ?? null);
      setMessages(data.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar SMS");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalSent = messages.filter((m) => m.status === "sent").length;
  const totalFailed = messages.filter((m) => m.status === "failed").length;

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="sms" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader
            title="SMS Marketing"
            subtitle="Envía mensajes directos a tus contactos vía Twilio"
          />
          <NelvyonDsButton onClick={() => setShowSend(true)} disabled={configured === false}>
            + Enviar SMS
          </NelvyonDsButton>
        </div>

        {error && (
          <NelvyonDsCard className="border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">⚠ {error}</p>
          </NelvyonDsCard>
        )}

        {/* Config banner */}
        {configured === false && (
          <NelvyonDsCard className="border-warning/30 bg-warning/5 p-5">
            <p className="font-medium text-warning">⚠️ Twilio no configurado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Añade <code className="rounded bg-muted px-1 py-0.5 text-xs">TWILIO_ACCOUNT_SID</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">TWILIO_AUTH_TOKEN</code> y{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">TWILIO_FROM_NUMBER</code> en Railway para activar SMS.
            </p>
          </NelvyonDsCard>
        )}
        {configured === true && (
          <NelvyonDsCard className="border-success/30 bg-success/5 p-3">
            <p className="text-sm text-success">
              ✅ SMS activo vía Twilio{fromNumber && <> · desde <code className="rounded bg-muted/50 px-1 text-xs">{fromNumber}</code></>}
            </p>
          </NelvyonDsCard>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KpiTile icon="📤" label="Enviados" value={totalSent} accent />
          <KpiTile icon="⚠️" label="Fallidos" value={totalFailed} />
          <KpiTile icon="📱" label="Total" value={messages.length} />
        </div>

        {/* Message log */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/30" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-5xl">📱</p>
            <p className="mt-4 text-lg font-semibold text-foreground">Sin SMS enviados</p>
            <p className="mt-2 text-sm text-muted-foreground">Envía tu primer mensaje para llegar directamente al móvil de tus contactos</p>
            {configured && (
              <NelvyonDsButton className="mt-5" onClick={() => setShowSend(true)}>+ Enviar SMS</NelvyonDsButton>
            )}
          </NelvyonDsCard>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m) => (
              <NelvyonDsCard key={m.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-foreground">{m.to}</span>
                      <NelvyonDsBadge tone={m.status === "sent" ? "success" : m.status === "queued" ? "primary" : "danger"}>
                        {m.status === "sent" ? "Enviado" : m.status === "queued" ? "En cola" : "Fallido"}
                      </NelvyonDsBadge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.body}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(m.createdAt).toLocaleString("es-ES")}
                  </span>
                </div>
              </NelvyonDsCard>
            ))}
          </div>
        )}
      </div>

      {showSend && <SendSmsModal onClose={() => setShowSend(false)} onSent={load} />}
    </SaasShellLayout>
  );
}
