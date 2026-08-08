"use client";

/**
 * /saas/webhooks sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Cada webhook es una caja plegable cuyo cuerpo son sus entregas recientes;
 * la DLQ y la documentacion de firma van en sus propias cajas.
 *
 * Logica de NELVYON intacta: `GET/POST/PATCH/DELETE /api/saas/webhooks`,
 * `GET/POST /api/saas/webhooks/dlq`, los tipos `Webhook`, `WebhookLog` y
 * `DlqFailure`, `EVENT_GROUPS`, `toggleEvent`/`toggleGroup`, `timeAgo`,
 * `openLogs` (carga perezosa), `toggleActive`, `deleteWebhook`, `copySecret`
 * y `replayDlq`.
 */
import { useCallback, useEffect, useState } from "react";
import Alert from "sweetalert2";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmModal } from "@/features/saas-w3crm/components/W3crmContentBox";

type WebhookEvent =
  | "contact.created" | "contact.updated" | "deal.created" | "deal.stage_changed" | "deal.won" | "deal.lost"
  | "campaign.sent" | "email.opened" | "email.clicked" | "form.submitted" | "appointment.booked"
  | "appointment.cancelled" | "invoice.paid" | "subscription.activated" | "subscription.cancelled";

interface Webhook {
  id: string; name: string; url: string; events: WebhookEvent[];
  active: boolean; secret: string; deliveries: number; failures: number;
  lastDeliveredAt: string | null; createdAt: string;
}

interface WebhookLog {
  id: string; webhookId: string; event: WebhookEvent;
  statusCode: number; duration: number; payload: string; createdAt: string;
}

type DlqFailure = {
  id: string; webhookId: string | null; eventType: string | null;
  errorMessage: string | null; attempts: number; lastAttemptAt: string; replayedAt: string | null;
};

const EVENT_GROUPS: Record<string, WebhookEvent[]> = {
  "CRM": ["contact.created", "contact.updated"],
  "Pipeline": ["deal.created", "deal.stage_changed", "deal.won", "deal.lost"],
  "Email": ["campaign.sent", "email.opened", "email.clicked"],
  "Formularios": ["form.submitted"],
  "Citas": ["appointment.booked", "appointment.cancelled"],
  "Facturación": ["invoice.paid", "subscription.activated", "subscription.cancelled"],
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function timeAgo(iso: string | null | undefined) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const d = Date.now() - t;
  if (d < 60000) return "ahora";
  if (d < 3600000) return `Hace ${Math.floor(d / 60000)}m`;
  if (d < 86400000) return `Hace ${Math.floor(d / 3600000)}h`;
  return `Hace ${Math.floor(d / 86400000)}d`;
}

function CreateWebhookModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function toggleEvent(ev: WebhookEvent) {
    setSelectedEvents((prev) => prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]);
  }

  function toggleGroup(events: WebhookEvent[]) {
    const allSelected = events.every((e) => selectedEvents.includes(e));
    setSelectedEvents((prev) => allSelected ? prev.filter((e) => !events.includes(e)) : [...new Set([...prev, ...events])]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/saas/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, events: selectedEvents }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      onCreated();
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo crear el webhook");
    } finally {
      setSaving(false);
    }
  }

  return (
    <W3crmModal titulo="Nuevo webhook" onClose={onClose} error={formError} size="lg" testId="modal-webhook">
      <form onSubmit={save}>
        <div className="row">
          <div className="col-lg-6">
            <div className="form-group mb-3">
              <label htmlFor="wh-nombre" className="text-black font-w600">Nombre <span className="required">*</span></label>
              <input id="wh-nombre" type="text" className="form-control" placeholder="Ej: Leads a Slack"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-6">
            <div className="form-group mb-3">
              <label htmlFor="wh-url" className="text-black font-w600">URL de destino <span className="required">*</span></label>
              <input id="wh-url" type="url" className="form-control" placeholder="https://hooks.slack.com/…"
                value={url} onChange={(e) => setUrl(e.target.value)} />
              <div className="form-text">Debe responder con HTTP 2xx en menos de 10 s.</div>
            </div>
          </div>
          <div className="col-lg-12">
            <label className="text-black font-w600 d-block mb-2">Eventos a escuchar <span className="required">*</span></label>
            {Object.entries(EVENT_GROUPS).map(([group, events]) => {
              const allSelected = events.every((e) => selectedEvents.includes(e));
              return (
                <div key={group} className="card mb-2">
                  <div className="card-body py-2">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <p className="fw-bold fs-14 mb-0">{group}</p>
                      <button type="button" className="btn btn-primary light btn-xs" onClick={() => toggleGroup(events)}>
                        {allSelected ? "Desmarcar todos" : "Marcar todos"}
                      </button>
                    </div>
                    <div className="row">
                      {events.map((ev) => (
                        <div className="col-sm-6" key={ev}>
                          <div className="form-check mb-1">
                            <input className="form-check-input" type="checkbox" id={`ev-${ev}`}
                              checked={selectedEvents.includes(ev)} onChange={() => toggleEvent(ev)} />
                            <label className="form-check-label fs-12" htmlFor={`ev-${ev}`}><code>{ev}</code></label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="col-lg-12">
            <div className="text-end">
              <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving || !name || !url || selectedEvents.length === 0}>
                {saving ? "Creando…" : "Crear webhook"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </W3crmModal>
  );
}

export default function SaasWebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [dlqFailures, setDlqFailures] = useState<DlqFailure[]>([]);
  const [loadingDlq, setLoadingDlq] = useState(false);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/saas/webhooks");
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as { webhooks?: Webhook[] };
        setWebhooks(Array.isArray(d.webhooks) ? d.webhooks : []);
      } else {
        setActionError(`Error al cargar webhooks (${res.status})`);
      }
    } catch {
      setActionError("Error al cargar webhooks");
    }
  }, []);

  const loadDlq = useCallback(async () => {
    setLoadingDlq(true);
    try {
      const res = await fetch("/api/saas/webhooks/dlq");
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as { failures?: DlqFailure[] };
        setDlqFailures((Array.isArray(d.failures) ? d.failures : []).filter((f) => !f.replayedAt));
      }
    } finally {
      setLoadingDlq(false);
    }
  }, []);

  useEffect(() => { void load(); void loadDlq(); }, [load, loadDlq]);

  async function openLogs(id: string) {
    if (showLogs === id) { setShowLogs(null); return; }
    setShowLogs(id);
    setLoadingLogs(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/saas/webhooks?id=${encodeURIComponent(id)}&logs=true`);
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(d?.error ?? `Error ${res.status}`);
      }
      const d = (await res.json().catch(() => ({}))) as { logs?: WebhookLog[] };
      setLogs(Array.isArray(d.logs) ? d.logs : []);
    } catch (err) {
      setLogs([]);
      setActionError(err instanceof Error ? err.message : "Error al cargar logs");
    } finally {
      setLoadingLogs(false);
    }
  }

  async function toggleActive(id: string, currentlyActive: boolean) {
    setTogglingId(id);
    setActionError(null);
    try {
      const res = await fetch("/api/saas/webhooks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !currentlyActive }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(d?.error ?? `Error ${res.status}`);
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al actualizar webhook");
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteWebhook(id: string) {
    const r = await Alert.fire({
      title: "¿Eliminar este webhook?",
      text: "Dejará de recibir eventos.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!r.value) return;
    setDeletingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/saas/webhooks?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(d?.error ?? `Error ${res.status}`);
      }
      if (showLogs === id) setShowLogs(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al eliminar webhook");
    } finally {
      setDeletingId(null);
    }
  }

  function copySecret(id: string, secret: string) {
    void navigator.clipboard?.writeText(secret);
    setCopiedSecret(id);
    setTimeout(() => setCopiedSecret(null), 1500);
  }

  async function replayDlq(id: string) {
    setReplayingId(id);
    setActionError(null);
    try {
      const res = await fetch("/api/saas/webhooks/dlq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "replay", id }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(d?.error ?? `Error ${res.status}`);
      }
      void loadDlq();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al reintentar entrega");
    } finally {
      setReplayingId(null);
    }
  }

  const visibleLogs = logs.filter((l) => l.webhookId === showLogs);
  const entregas = webhooks.reduce((s, w) => s + num(w.deliveries), 0);
  const fallos = webhooks.reduce((s, w) => s + num(w.failures), 0);

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Webhooks" parentTitle="Cuenta" pageTitle="Webhooks" />
      <div className="container-fluid">
        <div className="row">
          {actionError && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {actionError}
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setActionError(null)} />
              </div>
            </div>
          )}

          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Webhooks activos" value={webhooks.filter((w) => w.active).length} accent /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Entregas totales" value={entregas.toLocaleString("es-ES")} /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Tasa de éxito" value={`${Math.round((1 - fallos / Math.max(1, entregas)) * 100)}%`} /></div>

          <div className="col-xl-12">
            <div className="mb-3">
              <ul className="d-flex align-items-center flex-wrap">
                <li><button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nuevo webhook</button></li>
              </ul>
            </div>

            {webhooks.length === 0 ? (
              <W3crmContentBox titulo="Webhooks" icono="fa-solid fa-bolt">
                <W3crmEmptyState title="Sin webhooks" description="Crea el primero para enviar eventos a tus sistemas externos." />
              </W3crmContentBox>
            ) : (
              webhooks.map((w) => (
                <W3crmContentBox
                  key={w.id}
                  testId="webhook"
                  icono="fa-solid fa-bolt"
                  defaultOpen={false}
                  titulo={
                    <>
                      {w.name || "—"}
                      <span className={`badge ${w.active ? "badge-success" : "badge-secondary"} ms-2`}>
                        {w.active ? "Activo" : "Inactivo"}
                      </span>
                      {num(w.failures) > 0 && <span className="badge badge-danger ms-1">{num(w.failures)} errores</span>}
                      <span className="text-muted fs-12 ms-2">{w.url}</span>
                    </>
                  }
                  acciones={
                    <>
                      <button type="button" className={`btn btn-sm me-2 ${w.active ? "btn-primary" : "btn-primary light"}`}
                        disabled={togglingId === w.id}
                        aria-pressed={w.active}
                        onClick={() => void toggleActive(w.id, w.active)}>
                        {w.active ? "Desactivar" : "Activar"}
                      </button>
                      <button type="button" className="btn btn-primary light btn-sm me-2" onClick={() => void openLogs(w.id)}>
                        {showLogs === w.id ? "Ocultar logs" : "Ver logs"}
                      </button>
                      <button type="button" className="btn btn-danger light btn-sm me-2" disabled={deletingId === w.id}
                        onClick={() => void deleteWebhook(w.id)}>
                        {deletingId === w.id ? "Eliminando…" : "Eliminar"}
                      </button>
                    </>
                  }
                >
                  <div className="mb-3">
                    {(w.events ?? []).map((e) => <span key={e} className="badge badge-secondary light me-1 fs-12">{e}</span>)}
                  </div>
                  <div className="d-flex align-items-center border rounded p-2 mb-3">
                    <span className="text-muted fs-12 me-2">Secret:</span>
                    <code className="flex-grow-1 fs-12 text-break">{w.secret}</code>
                    <button type="button" className="btn btn-primary light btn-xs ms-2" onClick={() => copySecret(w.id, w.secret)}>
                      {copiedSecret === w.id ? "✓ Copiado" : "Copiar"}
                    </button>
                  </div>
                  <p className="fs-12 text-muted">
                    {num(w.deliveries).toLocaleString("es-ES")} entregas · Última: {timeAgo(w.lastDeliveredAt)}
                  </p>

                  {showLogs === w.id && (
                    <div className="table-responsive">
                      <div className="dataTables_wrapper no-footer">
                        {loadingLogs ? (
                          <W3crmCargando texto="Cargando entregas…" />
                        ) : visibleLogs.length === 0 ? (
                          <W3crmEmptyState title="Sin entregas registradas" />
                        ) : (
                          <table className="table table-responsive-lg table-striped table-condensed flip-content">
                            <thead>
                              <tr>
                                <th className="text-black">Código</th>
                                <th className="text-black">Evento</th>
                                <th className="text-black">Duración</th>
                                <th className="text-black">Cuándo</th>
                                <th className="text-black">Payload</th>
                              </tr>
                            </thead>
                            <tbody>
                              {visibleLogs.map((log) => (
                                <tr key={log.id}>
                                  <td>
                                    <span className={`badge ${num(log.statusCode) >= 200 && num(log.statusCode) < 300 ? "badge-success" : "badge-danger"}`}>
                                      {num(log.statusCode)}
                                    </span>
                                  </td>
                                  <td><code className="fs-12">{log.event}</code></td>
                                  <td>{num(log.duration)} ms</td>
                                  <td>{timeAgo(log.createdAt)}</td>
                                  <td><span className="text-muted fs-12">{(log.payload ?? "").slice(0, 80)}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}
                </W3crmContentBox>
              ))
            )}

            <W3crmContentBox titulo="Cola de fallos (DLQ)" icono="fa-solid fa-triangle-exclamation">
              {loadingDlq ? (
                <W3crmCargando texto="Cargando fallos…" />
              ) : dlqFailures.length === 0 ? (
                <W3crmEmptyState title="Sin fallos pendientes" description="Todas las entregas llegaron a su destino." />
              ) : (
                <div className="table-responsive">
                  <div className="dataTables_wrapper no-footer">
                    <table className="table table-responsive-lg table-striped table-condensed flip-content">
                      <thead>
                        <tr>
                          <th className="text-black">Evento</th>
                          <th className="text-black">Error</th>
                          <th className="text-black">Intentos</th>
                          <th className="text-black">Último intento</th>
                          <th className="text-black text-end">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dlqFailures.map((f) => (
                          <tr key={f.id}>
                            <td><code className="fs-12">{f.eventType ?? "event"}</code></td>
                            <td><span className="text-muted fs-12">{f.errorMessage ?? "Error de entrega"}</span></td>
                            <td>{num(f.attempts)}</td>
                            <td>{timeAgo(f.lastAttemptAt)}</td>
                            <td className="text-end">
                              <button type="button" className="btn btn-primary btn-sm" disabled={replayingId === f.id}
                                onClick={() => void replayDlq(f.id)}>
                                {replayingId === f.id ? "Reenviando…" : "Reintentar"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </W3crmContentBox>

            <W3crmContentBox titulo="Cómo verificar webhooks" icono="fa-solid fa-lock" defaultOpen={false}>
              <p className="fs-14 text-muted">
                Cada evento incluye una firma HMAC-SHA256 en el header <code>X-Nelvyon-Signature</code>. Verifícala con tu secret.
              </p>
              <pre className="border rounded p-3 fs-12 mb-0">{`// Node.js
const sig = crypto.createHmac('sha256', YOUR_SECRET)
  .update(rawBody).digest('hex');
if (sig !== req.headers['x-nelvyon-signature']) {
  return res.status(401).json({ error: 'Invalid signature' });
}`}</pre>
            </W3crmContentBox>
          </div>
        </div>
      </div>

      {showModal && (
        <CreateWebhookModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setActionError(null); void load(); }}
        />
      )}
    </SaasW3crmShell>
  );
}
