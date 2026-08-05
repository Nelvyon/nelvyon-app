"use client";

/**
 * /saas/helpdesk sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: listado de tickets -> `W3crmContentBox` + `W3crmDataTable`; alta y
 * detalle (conversacion, SLA, macros, respuesta) -> `W3crmModal`; KPIs ->
 * `W3crmKpiTile`. Sin componentes nuevos.
 *
 * Contrato de la suite: `saas-nav-full-coverage` recorre `SAAS_NAV_ITEMS` y
 * exige que la ruta cargue sin redirigir a login y sin "Internal Server Error"
 * en el body. No habia `data-testid` previos; solo se usan los que aceptan los
 * componentes ya portados, para poder certificar.
 *
 * El titulo usa "Helpdesk" (la etiqueta de `saasNav`) y no "Help Desk": el
 * `SideBar` de W3CRM ya trae un boton fijo "Help Desk" hacia esta misma ruta en
 * todas las paginas, y repetir el texto crearia dos nombres accesibles iguales.
 *
 * Logica de NELVYON intacta: `/api/saas/helpdesk` con sus variantes (`?id=`
 * para mensajes, `?resource=macros`) y sus acciones POST (alta, `message`,
 * `update`, `apply-macro`); los tipos `Ticket`, `Message` y `Macro`, los
 * catalogos de prioridad, estado y politica SLA, `slaStatus`, `fmtDue`, el
 * filtro por estado y los recuentos de abiertos, urgentes e incumplidos.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable, W3crmModal } from "@/features/saas-w3crm/components/W3crmContentBox";

type Priority = "low" | "medium" | "high" | "urgent";
type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type SlaPolicy = "standard" | "priority" | "urgent";

interface Ticket {
  id: string; subject: string; description: string | null;
  status: TicketStatus; priority: Priority; slaPolicy: SlaPolicy;
  contactName: string; contactEmail: string;
  assignedTo: string | null; resolvedAt: string | null;
  firstResponseDue: string | null; resolutionDue: string | null; firstRespondedAt: string | null;
  slaBreached: boolean; messageCount: number; createdAt: string; updatedAt: string;
}
interface Message {
  id: string; ticketId: string; author: string; body: string; isInternal: boolean; createdAt: string;
}
interface Macro {
  id: string; name: string; actions: Array<{ type: string; [k: string]: unknown }>; active: boolean;
}

const PRIORITY_BADGE: Record<Priority, string> = {
  low: "badge-secondary", medium: "badge-warning", high: "badge-warning", urgent: "badge-danger",
};
const PRIORITY_LABEL: Record<Priority, string> = { low: "Baja", medium: "Media", high: "Alta", urgent: "Urgente" };
const STATUS_BADGE: Record<TicketStatus, string> = {
  open: "badge-warning", in_progress: "badge-primary", resolved: "badge-success", closed: "badge-success",
};
const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Abierto", in_progress: "En curso", resolved: "Resuelto", closed: "Cerrado",
};
const SLA_LABEL: Record<SlaPolicy, string> = {
  standard: "Estándar (4h/24h)", priority: "Prioritario (1h/8h)", urgent: "Urgente (30m/4h)",
};

/** Catalogos que pueden crecer en el backend sin dejar la pantalla en blanco. */
function etiquetaPrioridad(p: Priority | string) { return PRIORITY_LABEL[p as Priority] ?? String(p || "—"); }
function badgePrioridad(p: Priority | string) { return PRIORITY_BADGE[p as Priority] ?? "badge-secondary"; }
function etiquetaEstado(s: TicketStatus | string) { return STATUS_LABEL[s as TicketStatus] ?? String(s || "—"); }
function badgeEstado(s: TicketStatus | string) { return STATUS_BADGE[s as TicketStatus] ?? "badge-secondary"; }
function etiquetaSla(s: SlaPolicy | string) { return SLA_LABEL[s as SlaPolicy] ?? String(s || "—"); }
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function slaStatus(due: string | null, done: string | null): "ok" | "risk" | "breached" | null {
  if (!due) return null;
  if (done) return "ok";
  const t = new Date(due).getTime();
  if (Number.isNaN(t)) return null;
  const diff = t - Date.now();
  if (diff < 0) return "breached";
  if (diff < 30 * 60000) return "risk";
  return "ok";
}
function fmtDue(due: string | null): string {
  if (!due) return "—";
  const d = new Date(due);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
}
/** Color del texto segun el estado del SLA. */
function claseSla(estado: ReturnType<typeof slaStatus>) {
  return estado === "breached" ? "text-danger" : estado === "risk" ? "text-warning" : "";
}

// ── Nuevo ticket ──────────────────────────────────────────────────────────────

function NewTicketModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [subject, setSubject] = useState("");
  const [desc, setDesc] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [slaPolicy, setSlaPolicy] = useState<SlaPolicy>("standard");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !contactEmail.trim()) { setError("Asunto y email son obligatorios"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/saas/helpdesk", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(), description: desc.trim(),
          contactName: contactName.trim(), contactEmail: contactEmail.trim(),
          priority, slaPolicy,
        }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error al crear ticket"); return; }
      onSaved(); onClose();
    } finally { setSaving(false); }
  }

  return (
    <W3crmModal titulo="Nuevo ticket" onClose={onClose} error={error} testId="modal-ticket">
      <form onSubmit={save}>
        <div className="row">
          <div className="col-lg-12">
            <div className="form-group mb-3">
              <label htmlFor="hd-asunto" className="text-black font-w600">Asunto <span className="required">*</span></label>
              <input id="hd-asunto" type="text" className="form-control" placeholder="Error al acceder al módulo…"
                value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-6">
            <div className="form-group mb-3">
              <label htmlFor="hd-nombre" className="text-black font-w600">Nombre contacto</label>
              <input id="hd-nombre" type="text" className="form-control" placeholder="María García"
                value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-6">
            <div className="form-group mb-3">
              <label htmlFor="hd-email" className="text-black font-w600">Email <span className="required">*</span></label>
              <input id="hd-email" type="email" className="form-control" placeholder="maria@empresa.com"
                value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-6">
            <div className="form-group mb-3">
              <label className="text-black font-w600 d-block">Prioridad</label>
              {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => (
                <button key={p} type="button" aria-pressed={priority === p}
                  className={`btn btn-sm me-1 mb-1 ${priority === p ? "btn-primary" : "btn-primary light"}`}
                  onClick={() => setPriority(p)}>
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
          <div className="col-lg-6">
            <div className="form-group mb-3">
              <label htmlFor="hd-sla" className="text-black font-w600">Política SLA</label>
              <select id="hd-sla" className="form-control" value={slaPolicy} onChange={(e) => setSlaPolicy(e.target.value as SlaPolicy)}>
                {(["standard", "priority", "urgent"] as SlaPolicy[]).map((s) => (
                  <option key={s} value={s}>{SLA_LABEL[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-lg-12">
            <div className="form-group mb-3">
              <label htmlFor="hd-descripcion" className="text-black font-w600">Descripción</label>
              <textarea id="hd-descripcion" className="form-control" rows={3}
                value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-12">
            <div className="text-end">
              <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Creando…" : "Crear ticket"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </W3crmModal>
  );
}

// ── Detalle de ticket ─────────────────────────────────────────────────────────

function TicketDetail({ ticket, macros, onClose, onUpdated }: {
  ticket: Ticket; macros: Macro[]; onClose: () => void; onUpdated: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInternal, setIsInternal] = useState(false);
  const [acting, setActing] = useState(false);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/saas/helpdesk?id=${ticket.id}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = (await res.json().catch(() => ({}))) as { messages?: Message[] };
      setMessages(Array.isArray(d.messages) ? d.messages : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar mensajes");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [ticket.id]);

  useEffect(() => { void loadMessages(); }, [loadMessages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setSendingMsg(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/helpdesk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "message", ticket_id: ticket.id, body: newMsg.trim(), is_internal: isInternal }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(d?.error ?? `Error ${res.status}`);
      }
      setNewMsg("");
      setIsInternal(false);
      await loadMessages();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar mensaje");
    } finally {
      setSendingMsg(false);
    }
  }

  async function changeStatus(status: TicketStatus) {
    setActing(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/helpdesk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id: ticket.id, status }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(d?.error ?? `Error ${res.status}`);
      }
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar estado");
    } finally {
      setActing(false);
    }
  }

  async function applyMacro(macroId: string) {
    setActing(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/helpdesk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply-macro", ticketId: ticket.id, macroId }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(d?.error ?? `Error ${res.status}`);
      }
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al aplicar macro");
    } finally {
      setActing(false);
    }
  }

  const slaResolucion = slaStatus(ticket.resolutionDue, ticket.resolvedAt);
  const slaRespuesta = slaStatus(ticket.firstResponseDue, ticket.firstRespondedAt);

  return (
    <W3crmModal titulo={ticket.subject || "Ticket"} onClose={onClose} error={error} size="lg" testId="detalle-ticket">
      <p className="fs-12 text-muted">{ticket.contactName || "—"} · {ticket.contactEmail || "—"}</p>

      <div className="mb-3">
        <span className={`badge ${badgeEstado(ticket.status)} me-1`}>{etiquetaEstado(ticket.status)}</span>
        <span className={`badge ${badgePrioridad(ticket.priority)} me-1`}>{etiquetaPrioridad(ticket.priority)}</span>
        {ticket.slaBreached && <span className="badge badge-danger">SLA incumplido</span>}
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <p className="fw-bold fs-14 mb-2">SLA — {etiquetaSla(ticket.slaPolicy)}</p>
          <div className="row">
            <div className="col-6">
              <p className="fs-12 text-muted mb-0">Primera respuesta</p>
              <p className={`mb-0 fw-bold ${claseSla(slaRespuesta)}`}>{fmtDue(ticket.firstResponseDue)}</p>
            </div>
            <div className="col-6">
              <p className="fs-12 text-muted mb-0">Resolución</p>
              <p className={`mb-0 fw-bold ${claseSla(slaResolucion)}`}>{fmtDue(ticket.resolutionDue)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <label className="text-black font-w600 d-block mb-2">Cambiar estado</label>
        {(["open", "in_progress", "resolved", "closed"] as TicketStatus[])
          .filter((s) => s !== ticket.status)
          .map((s) => (
            <button key={s} type="button" className="btn btn-primary light btn-sm me-1 mb-1" disabled={acting}
              onClick={() => void changeStatus(s)}>
              {STATUS_LABEL[s]}
            </button>
          ))}
      </div>

      {macros.length > 0 && (
        <div className="mb-3">
          <label className="text-black font-w600 d-block mb-2">Macros</label>
          {macros.map((m) => (
            <button key={m.id} type="button" className="btn btn-primary light btn-sm me-1 mb-1" disabled={acting}
              onClick={() => void applyMacro(m.id)}>
              ⚡ {m.name || "Macro"}
            </button>
          ))}
        </div>
      )}

      <p className="fw-bold fs-14 mb-2">Conversación ({messages.length})</p>
      {loading ? (
        <W3crmCargando texto="Cargando mensajes…" />
      ) : messages.length === 0 ? (
        <W3crmEmptyState title="Sin mensajes todavía" />
      ) : (
        <W3crmDataTable
          filas={messages}
          etiqueta="mensajes"
          wrapperId="mensajes_wrapper"
          porPagina={10}
          columnas={[{ titulo: "Autor" }, { titulo: "Mensaje" }, { titulo: "Fecha", alFinal: true }]}
          render={(m) => (
            <tr key={m.id}>
              <td>
                <span className="fw-bold">{m.author || "—"}</span>
                {m.isInternal ? <span className="badge badge-warning ms-1 fs-12">interno</span> : null}
              </td>
              <td><span style={{ whiteSpace: "pre-wrap" }}>{m.body}</span></td>
              <td className="text-end">{fmtDue(m.createdAt)}</td>
            </tr>
          )}
        />
      )}

      <form onSubmit={sendMessage} className="mt-3">
        <div className="form-group mb-2">
          <label htmlFor="hd-respuesta" className="text-black font-w600">Responder</label>
          <textarea id="hd-respuesta" className="form-control" rows={3} placeholder="Escribe una respuesta…"
            value={newMsg} onChange={(e) => setNewMsg(e.target.value)} />
        </div>
        <div className="form-check mb-2">
          <input className="form-check-input" type="checkbox" id="hd-interno"
            checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
          <label className="form-check-label fs-12" htmlFor="hd-interno">
            Nota interna (no visible para el cliente)
          </label>
        </div>
        <div className="text-end">
          <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cerrar</button>
          <button type="submit" className="btn btn-primary" disabled={sendingMsg || !newMsg.trim()}>
            {sendingMsg ? "Enviando…" : "Responder"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function SaasHelpdeskPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [tRes, mRes] = await Promise.all([
        fetch("/api/saas/helpdesk"),
        fetch("/api/saas/helpdesk?resource=macros"),
      ]);
      if (!tRes.ok) throw new Error(`Error ${tRes.status}`);
      const tData = (await tRes.json().catch(() => ({}))) as { tickets?: Ticket[] };
      setTickets(Array.isArray(tData.tickets) ? tData.tickets : []);
      if (mRes.ok) {
        const d = (await mRes.json().catch(() => ({}))) as { macros?: Macro[] };
        setMacros(Array.isArray(d.macros) ? d.macros : []);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Error al cargar tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);
  const open = tickets.filter((t) => t.status === "open").length;
  const urgent = tickets.filter((t) => t.priority === "urgent" && t.status !== "resolved" && t.status !== "closed").length;
  const breached = tickets.filter((t) => t.slaBreached).length;

  const FILTROS: Array<[TicketStatus | "all", string]> = [
    ["all", "Todos"], ["open", "Abiertos"], ["in_progress", "En curso"],
    ["resolved", "Resueltos"], ["closed", "Cerrados"],
  ];

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Helpdesk" parentTitle="Gestión" pageTitle="Helpdesk" />
      <div className="container-fluid">
        <div className="row">
          {loadError && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {loadError}
                <button type="button" className="btn-close" aria-label="Cerrar"
                  onClick={() => { setLoadError(null); void load(); }} />
              </div>
            </div>
          )}

          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Total tickets" value={tickets.length} accent /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Abiertos" value={open} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Urgentes" value={urgent} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="SLA incumplido" value={breached} /></div>

          <div className="col-xl-12">
            <W3crmContentBox titulo="Filtro" icono="fas fa-filter" bodyClassName="card-body pb-3">
              <div className="row">
                <div className="col-xl-4 col-sm-6">
                  <label className="visually-hidden" htmlFor="hd-filtro">Estado</label>
                  <select id="hd-filtro" className="form-control" value={filter}
                    onChange={(e) => setFilter(e.target.value as TicketStatus | "all")}>
                    {FILTROS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="col-xl-4 col-sm-6">
                  <button type="button" className="btn btn-danger light mt-3 mt-xl-0" onClick={() => setFilter("all")}>
                    Quitar filtros
                  </button>
                </div>
              </div>
            </W3crmContentBox>

            <div className="mb-3">
              <ul className="d-flex align-items-center flex-wrap">
                <li><button type="button" className="btn btn-primary" onClick={() => setShowNew(true)}>+ Nuevo ticket</button></li>
              </ul>
            </div>

            <W3crmContentBox titulo="Tickets" icono="fa-solid fa-headset">
              {loading ? (
                <W3crmCargando texto="Cargando tickets…" />
              ) : filtered.length === 0 ? (
                <W3crmEmptyState
                  title="Sin tickets pendientes"
                  description={filter === "all" ? "Todos los tickets están al día." : "Ningún ticket en este estado."}
                />
              ) : (
                <W3crmDataTable
                  filas={filtered}
                  etiqueta="tickets"
                  reiniciarEn={filter}
                  columnas={[{ titulo: "Asunto" }, { titulo: "Contacto" }, { titulo: "Prioridad" }, { titulo: "Mensajes" }, { titulo: "Resolución (SLA)" }, { titulo: "Estado" }, { titulo: "Gestión", alFinal: true }]}
                  render={(t) => {
                    const sla = slaStatus(t.resolutionDue, t.resolvedAt);
                    return (
                      <tr key={t.id}>
                        <td>
                          <span className="fw-bold">{t.subject || "—"}</span>
                          {t.slaBreached && <span className="badge badge-danger ms-2 fs-12">SLA ⚠</span>}
                        </td>
                        <td>
                          <span>{t.contactName || "—"}</span>
                          <div className="text-muted fs-12">{t.contactEmail || "—"}</div>
                        </td>
                        <td><span className={`badge ${badgePrioridad(t.priority)}`}>{etiquetaPrioridad(t.priority)}</span></td>
                        <td>{num(t.messageCount)}</td>
                        <td><span className={claseSla(sla)}>{fmtDue(t.resolutionDue)}</span></td>
                        <td><span className={`badge ${badgeEstado(t.status)}`}>{etiquetaEstado(t.status)}</span></td>
                        <td className="text-end">
                          <button type="button" className="btn btn-primary light btn-sm"
                            aria-label={`Abrir ticket ${t.subject || ""}`} onClick={() => setSelected(t)}>
                            Abrir
                          </button>
                        </td>
                      </tr>
                    );
                  }}
                />
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>

      {showNew && <NewTicketModal onClose={() => setShowNew(false)} onSaved={load} />}
      {selected && (
        <TicketDetail ticket={selected} macros={macros} onClose={() => setSelected(null)} onUpdated={load} />
      )}
    </SaasW3crmShell>
  );
}
