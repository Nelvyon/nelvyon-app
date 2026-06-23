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

// ─── Types ────────────────────────────────────────────────────────────────────

interface WaMessage {
  id: string;
  to: string;
  type: "text" | "template" | "media";
  content: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  sentAt: string | null;
  error: string | null;
}

const STATUS_TONE = {
  queued: "primary",
  sent: "primary",
  delivered: "success",
  read: "success",
  failed: "danger",
} as const;

const STATUS_LABELS = {
  queued: "En cola",
  sent: "Enviado",
  delivered: "Entregado",
  read: "Leído",
  failed: "Error",
} as const;

// ─── Send modal ───────────────────────────────────────────────────────────────

function SendWaModal({ onClose }: { onClose: () => void }) {
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
      const res = await fetch("/api/v1/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), message: msg.trim() }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(j.detail ?? "Error al enviar");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Enviar mensaje WhatsApp</h2>
        {done ? (
          <div className="py-8 text-center">
            <p className="text-4xl">✅</p>
            <p className="mt-3 font-medium text-foreground">Mensaje enviado</p>
            <NelvyonDsButton className="mt-5" onClick={onClose}>Cerrar</NelvyonDsButton>
          </div>
        ) : (
          <form onSubmit={send} className="space-y-4">
            {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
              <p className="text-xs text-green-400">
                💡 El destinatario debe haber iniciado conversación con tu número de WhatsApp Business o aceptado mensajes de plantilla.
              </p>
            </div>
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
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Mensaje *</label>
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows={5}
                placeholder="Hola {{nombre}}, te escribimos desde Nelvyon…"
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
              <NelvyonDsButton type="submit" disabled={sending} className="flex-1">
                {sending ? "Enviando…" : "Enviar"}
              </NelvyonDsButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SaasWhatsAppPage() {
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSend, setShowSend] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/whatsapp/messages?limit=50");
      if (res.status === 503) { setConfigured(false); return; }
      setConfigured(true);
      const data = (await res.json().catch(() => ({ messages: [] }))) as { messages: WaMessage[] };
      setMessages(data.messages ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = {
    total: messages.length,
    delivered: messages.filter((m) => m.status === "delivered" || m.status === "read").length,
    read: messages.filter((m) => m.status === "read").length,
    failed: messages.filter((m) => m.status === "failed").length,
  };

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="whatsapp" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader
            title="WhatsApp Business"
            subtitle="Mensajería directa con tus contactos via WhatsApp Cloud API"
          />
          <NelvyonDsButton onClick={() => setShowSend(true)}>+ Enviar mensaje</NelvyonDsButton>
        </div>

        {/* Config warning */}
        {configured === false && (
          <NelvyonDsCard className="border-yellow-500/30 bg-yellow-500/5 p-5">
            <p className="font-medium text-yellow-400">⚠️ WhatsApp Business no configurado</p>
            <p className="mt-2 text-sm text-muted-foreground">Para activar WhatsApp añade en Railway:</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li><code className="rounded bg-muted px-1 text-xs">WHATSAPP_TOKEN</code> — Token de acceso de Meta Business</li>
              <li><code className="rounded bg-muted px-1 text-xs">WHATSAPP_PHONE_NUMBER_ID</code> — ID de número de teléfono</li>
              <li><code className="rounded bg-muted px-1 text-xs">WHATSAPP_VERIFY_TOKEN</code> — Token de verificación webhook</li>
            </ul>
          </NelvyonDsCard>
        )}

        {/* Onboarding steps when not configured */}
        {configured === false && (
          <NelvyonDsCard className="p-5">
            <p className="mb-3 font-semibold text-foreground">Pasos para activar WhatsApp Business</p>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary">1.</span> Crea una cuenta en <strong className="text-foreground">Meta for Developers</strong></li>
              <li className="flex gap-2"><span className="text-primary">2.</span> Crea una App de tipo Business y activa WhatsApp</li>
              <li className="flex gap-2"><span className="text-primary">3.</span> Añade un número de teléfono de empresa y verifica</li>
              <li className="flex gap-2"><span className="text-primary">4.</span> Copia el token permanente y el Phone Number ID</li>
              <li className="flex gap-2"><span className="text-primary">5.</span> Configura el webhook con URL: <code className="rounded bg-muted px-1 text-xs">/api/v1/whatsapp/webhook</code></li>
              <li className="flex gap-2"><span className="text-primary">6.</span> Añade las variables en Railway y redeploy</li>
            </ol>
          </NelvyonDsCard>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total enviados", value: stats.total },
            { label: "Entregados", value: stats.delivered },
            { label: "Leídos", value: stats.read },
            { label: "Fallidos", value: stats.failed },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {/* Messages list */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/30" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-5xl">💬</p>
            <p className="mt-4 text-lg font-semibold text-foreground">Sin mensajes aún</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {configured ? "Envía tu primer mensaje de WhatsApp" : "Configura WhatsApp Business para empezar"}
            </p>
            {configured && <NelvyonDsButton className="mt-5" onClick={() => setShowSend(true)}>+ Enviar mensaje</NelvyonDsButton>}
          </NelvyonDsCard>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m) => (
              <NelvyonDsCard key={m.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm text-foreground">{m.to}</p>
                      <NelvyonDsBadge tone={STATUS_TONE[m.status]}>{STATUS_LABELS[m.status]}</NelvyonDsBadge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{m.content}</p>
                    {m.error && <p className="mt-0.5 text-xs text-red-400">{m.error}</p>}
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {m.sentAt ? new Date(m.sentAt).toLocaleString("es-ES") : "—"}
                  </p>
                </div>
              </NelvyonDsCard>
            ))}
          </div>
        )}
      </div>

      {showSend && <SendWaModal onClose={() => { setShowSend(false); void load(); }} />}
    </SaasShellLayout>
  );
}
