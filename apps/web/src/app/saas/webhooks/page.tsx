"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type WebhookEvent =
  | "contact.created" | "contact.updated" | "deal.created" | "deal.stage_changed" | "deal.won" | "deal.lost"
  | "campaign.sent" | "email.opened" | "email.clicked" | "form.submitted" | "appointment.booked"
  | "appointment.cancelled" | "invoice.paid" | "subscription.activated" | "subscription.cancelled";

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  secret: string;
  deliveries: number;
  failures: number;
  lastDeliveredAt: string | null;
  createdAt: string;
}

interface WebhookLog {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  statusCode: number;
  duration: number;
  payload: string;
  createdAt: string;
}

const EVENT_GROUPS: Record<string, WebhookEvent[]> = {
  "CRM": ["contact.created", "contact.updated"],
  "Pipeline": ["deal.created", "deal.stage_changed", "deal.won", "deal.lost"],
  "Email": ["campaign.sent", "email.opened", "email.clicked"],
  "Formularios": ["form.submitted"],
  "Citas": ["appointment.booked", "appointment.cancelled"],
  "Facturación": ["invoice.paid", "subscription.activated", "subscription.cancelled"],
};


function CreateWebhookModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([]);
  const [saving, setSaving] = useState(false);

  function toggleEvent(ev: WebhookEvent) {
    setSelectedEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  }

  function toggleGroup(events: WebhookEvent[]) {
    const allSelected = events.every(e => selectedEvents.includes(e));
    setSelectedEvents(prev => allSelected ? prev.filter(e => !events.includes(e)) : [...new Set([...prev, ...events])]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/saas/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, events: selectedEvents }),
      });
    } finally {
      setSaving(false);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nuevo webhook</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={save} className="space-y-5 p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Leads a Slack"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">URL de destino *</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://hooks.slack.com/..." type="url"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            <p className="mt-1 text-[11px] text-muted-foreground">Debe responder con HTTP 2xx en menos de 10s</p>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Eventos a escuchar *</label>
            <div className="space-y-3">
              {Object.entries(EVENT_GROUPS).map(([group, events]) => {
                const allSelected = events.every(e => selectedEvents.includes(e));
                return (
                  <div key={group} className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium text-foreground">{group}</p>
                      <button type="button" onClick={() => toggleGroup(events)} className="text-[11px] text-primary hover:underline">
                        {allSelected ? "Desmarcar todos" : "Marcar todos"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {events.map(ev => (
                        <label key={ev} className="flex items-center gap-2 cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                          <input type="checkbox" checked={selectedEvents.includes(ev)} onChange={() => toggleEvent(ev)} className="accent-primary" />
                          <span className="font-mono">{ev}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving || !name || !url || selectedEvents.length === 0} className="flex-1">
              {saving ? "Creando…" : "Crear webhook"}
            </NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000) return "ahora";
  if (d < 3600000) return `Hace ${Math.floor(d / 60000)}m`;
  if (d < 86400000) return `Hace ${Math.floor(d / 3600000)}h`;
  return `Hace ${Math.floor(d / 86400000)}d`;
}

export default function SaasWebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/saas/webhooks");
      if (res.ok) {
        const d = (await res.json()) as { webhooks?: Webhook[] };
        setWebhooks(d.webhooks ?? []);
      }
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function openLogs(id: string) {
    if (showLogs === id) { setShowLogs(null); return; }
    setShowLogs(id);
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/saas/webhooks?id=${id}&logs=true`);
      if (res.ok) {
        const d = (await res.json()) as { logs?: WebhookLog[] };
        setLogs(d.logs ?? []);
      } else {
        setLogs([]);
      }
    } catch { setLogs([]); }
    finally { setLoadingLogs(false); }
  }

  function toggleActive(id: string) {
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, active: !w.active } : w));
  }

  function copySecret(id: string, secret: string) {
    void navigator.clipboard.writeText(secret);
    setCopiedSecret(id);
    setTimeout(() => setCopiedSecret(null), 1500);
  }

  const visibleLogs = logs.filter(l => l.webhookId === showLogs);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="webhooks" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="Webhooks" subtitle="Envía eventos en tiempo real a tus sistemas externos (Slack, Zapier, N8N, Make…)" />
              <NelvyonDsButton onClick={() => setShowModal(true)}>+ Nuevo webhook</NelvyonDsButton>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Webhooks activos", value: webhooks.filter(w => w.active).length },
                { label: "Entregas totales", value: webhooks.reduce((s, w) => s + w.deliveries, 0).toLocaleString("es-ES") },
                { label: "Tasa de éxito", value: `${Math.round((1 - webhooks.reduce((s, w) => s + w.failures, 0) / Math.max(1, webhooks.reduce((s, w) => s + w.deliveries, 0))) * 100)}%` },
              ].map(({ label, value }) => (
                <NelvyonDsCard key={label} className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
                </NelvyonDsCard>
              ))}
            </div>

            <div className="space-y-4">
              {webhooks.map(w => (
                <NelvyonDsCard key={w.id} className="overflow-hidden p-0">
                  <div className="p-5">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{w.name}</h3>
                          <NelvyonDsBadge tone={w.active ? "success" : "primary"}>{w.active ? "Activo" : "Inactivo"}</NelvyonDsBadge>
                          {w.failures > 0 && <NelvyonDsBadge tone="danger">{w.failures} errores</NelvyonDsBadge>}
                        </div>
                        <p className="text-xs text-primary font-mono truncate">{w.url}</p>
                        <div className="flex flex-wrap gap-1">
                          {w.events.slice(0, 4).map(e => <span key={e} className="rounded-md bg-muted/30 px-2 py-0.5 text-[11px] font-mono text-muted-foreground">{e}</span>)}
                          {w.events.length > 4 && <span className="text-[11px] text-muted-foreground">+{w.events.length - 4} más</span>}
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>{w.deliveries.toLocaleString()} entregas</span>
                          {w.lastDeliveredAt && <span>Última: {timeAgo(w.lastDeliveredAt)}</span>}
                        </div>
                        {/* Secret */}
                        <div className="flex items-center gap-2 rounded-lg bg-muted/10 border border-border px-3 py-2">
                          <span className="text-xs text-muted-foreground font-mono">Secret:</span>
                          <code className="flex-1 text-xs text-muted-foreground font-mono blur-sm hover:blur-none transition-all select-all">{w.secret}</code>
                          <button onClick={() => copySecret(w.id, w.secret)} className="text-xs text-primary hover:underline shrink-0">
                            {copiedSecret === w.id ? "✓ Copiado" : "Copiar"}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button onClick={() => toggleActive(w.id)}
                          className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full transition-colors ${w.active ? "bg-primary" : "bg-muted"}`}>
                          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${w.active ? "translate-x-5" : "translate-x-1"}`} />
                        </button>
                        <NelvyonDsButton variant="ghost" className="text-xs" onClick={() => openLogs(w.id)}>
                          {showLogs === w.id ? "Ocultar logs" : "Ver logs"}
                        </NelvyonDsButton>
                        <NelvyonDsButton variant="ghost" className="text-xs">✉ Test</NelvyonDsButton>
                      </div>
                    </div>
                  </div>
                  {showLogs === w.id && (
                    <div className="border-t border-border">
                      <div className="px-5 py-3">
                        <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Entregas recientes</p>
                        <div className="space-y-2">
                          {loadingLogs ? (
                            <div className="h-16 animate-pulse rounded-xl bg-muted/30" />
                          ) : visibleLogs.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Sin entregas registradas.</p>
                          ) : visibleLogs.map(log => (
                            <div key={log.id} className="flex items-start gap-3 rounded-lg bg-muted/10 p-3">
                              <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-mono font-bold ${log.statusCode >= 200 && log.statusCode < 300 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                {log.statusCode}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-foreground">{log.event}</span>
                                  <span className="text-[11px] text-muted-foreground">{log.duration}ms · {timeAgo(log.createdAt)}</span>
                                </div>
                                <p className="mt-1 text-[11px] text-muted-foreground font-mono truncate">{log.payload}</p>
                              </div>
                              <button className="text-[11px] text-primary hover:underline shrink-0">Reenviar</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </NelvyonDsCard>
              ))}
            </div>

            {/* Docs */}
            <NelvyonDsCard className="border-primary/20 bg-primary/5 p-5">
              <h3 className="mb-2 text-sm font-semibold text-foreground">📖 Cómo verificar webhooks</h3>
              <p className="mb-3 text-xs text-muted-foreground">Cada evento incluye una firma HMAC-SHA256 en el header <code className="text-primary">X-Nelvyon-Signature</code>. Verifica con tu secret.</p>
              <pre className="overflow-x-auto rounded-lg bg-muted/20 p-3 text-[11px] text-foreground font-mono">
{`// Node.js
const sig = crypto.createHmac('sha256', YOUR_SECRET)
  .update(rawBody).digest('hex');
if (sig !== req.headers['x-nelvyon-signature']) {
  return res.status(401).json({ error: 'Invalid signature' });
}`}
              </pre>
            </NelvyonDsCard>
      {showModal && <CreateWebhookModal onClose={() => setShowModal(false)} />}
    </SaasShellLayout>
  );
}
