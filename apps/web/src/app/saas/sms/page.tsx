"use client";

import { useCallback, useEffect, useState } from "react";

import {
  NelvyonDsBadge,
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
} from "@/design-system/components";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SmsCampaign {
  id: string;
  name: string;
  message: string;
  status: "draft" | "scheduled" | "running" | "completed" | "cancelled";
  totalRecipients: number;
  sentCount: number;
  scheduledAt: string | null;
  createdAt: string;
}

const STATUS_LABELS = {
  draft: "Borrador",
  scheduled: "Programado",
  running: "Enviando",
  completed: "Completado",
  cancelled: "Cancelado",
} as const;

const STATUS_TONE = {
  draft: "primary",
  scheduled: "warning",
  running: "primary",
  completed: "success",
  cancelled: "danger",
} as const;

const MAX_SMS = 160;

// ─── Send single SMS modal ────────────────────────────────────────────────────

function SendSmsModal({ onClose }: { onClose: () => void }) {
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
      const res = await fetch("/api/v1/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_number: to.trim(), message: msg.trim() }),
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
        <h2 className="mb-5 text-lg font-semibold text-foreground">Enviar SMS</h2>
        {done ? (
          <div className="py-8 text-center">
            <p className="text-4xl">✅</p>
            <p className="mt-3 font-medium text-foreground">SMS enviado</p>
            <NelvyonDsButton className="mt-5" onClick={onClose}>Cerrar</NelvyonDsButton>
          </div>
        ) : (
          <form onSubmit={send} className="space-y-4">
            {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
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
                <span className={msg.length > MAX_SMS ? "text-red-400" : ""}>{msg.length}/{MAX_SMS}</span>
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

// ─── New campaign modal ───────────────────────────────────────────────────────

function NewCampaignModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !msg.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/sms/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), message: msg.trim() }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(j.detail ?? "Error al crear");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Nueva campaña SMS</h2>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Campaña de reactivación julio"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Mensaje *</span>
              <span className={msg.length > MAX_SMS ? "text-red-400" : ""}>{msg.length}/{MAX_SMS}</span>
            </label>
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              rows={4}
              placeholder="Hola {{nombre}}, tenemos una oferta exclusiva para ti…"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted-foreground">Usa {{"{{"}}nombre{"}}"}} para personalizar</p>
          </div>
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving || msg.length > MAX_SMS} className="flex-1">
              {saving ? "Creando…" : "Crear campaña"}
            </NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SaasSmsPage() {
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSend, setShowSend] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/sms/campaigns");
      if (res.status === 503) { setConfigured(false); return; }
      setConfigured(true);
      const data = (await res.json().catch(() => ({ campaigns: [] }))) as { campaigns: SmsCampaign[] };
      setCampaigns(data.campaigns ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalSent = campaigns.reduce((s, c) => s + c.sentCount, 0);

  return (
    <DashboardLayout sidebar={<SaasSidebar activeId="sms" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader
            title="SMS Marketing"
            subtitle="Envía mensajes directos a tus contactos via Twilio"
          />
          <div className="flex gap-2">
            <NelvyonDsButton variant="ghost" onClick={() => setShowSend(true)}>Enviar SMS único</NelvyonDsButton>
            <NelvyonDsButton onClick={() => setShowNew(true)}>+ Nueva campaña</NelvyonDsButton>
          </div>
        </div>

        {/* Config warning */}
        {configured === false && (
          <NelvyonDsCard className="border-yellow-500/30 bg-yellow-500/5 p-5">
            <p className="font-medium text-yellow-400">⚠️ Twilio no configurado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Añade <code className="rounded bg-muted px-1 py-0.5 text-xs">TWILIO_ACCOUNT_SID</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">TWILIO_AUTH_TOKEN</code> y{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">TWILIO_PHONE_NUMBER</code> en Railway para activar SMS.
            </p>
          </NelvyonDsCard>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Campañas", value: campaigns.length },
            { label: "SMS enviados", value: totalSent.toLocaleString("es-ES") },
            { label: "Activas", value: campaigns.filter((c) => c.status === "running").length },
            { label: "Completadas", value: campaigns.filter((c) => c.status === "completed").length },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {/* Campaigns list */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/30" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-5xl">📱</p>
            <p className="mt-4 text-lg font-semibold text-foreground">Sin campañas SMS</p>
            <p className="mt-2 text-sm text-muted-foreground">Crea tu primera campaña para llegar directamente al móvil</p>
            <NelvyonDsButton className="mt-5" onClick={() => setShowNew(true)}>+ Nueva campaña</NelvyonDsButton>
          </NelvyonDsCard>
        ) : (
          <div className="flex flex-col gap-3">
            {campaigns.map((c) => (
              <NelvyonDsCard key={c.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{c.name}</p>
                      <NelvyonDsBadge tone={STATUS_TONE[c.status]} size="sm">
                        {STATUS_LABELS[c.status]}
                      </NelvyonDsBadge>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{c.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.sentCount} / {c.totalRecipients} enviados
                    </p>
                  </div>
                  {c.status === "draft" && (
                    <NelvyonDsButton size="sm" variant="ghost">Enviar</NelvyonDsButton>
                  )}
                </div>
              </NelvyonDsCard>
            ))}
          </div>
        )}
      </div>

      {showSend && <SendSmsModal onClose={() => setShowSend(false)} />}
      {showNew && <NewCampaignModal onClose={() => setShowNew(false)} onSaved={load} />}
    </DashboardLayout>
  );
}
