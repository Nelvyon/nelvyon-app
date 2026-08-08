"use client";

/**
 * /saas/citas sobre dos pantallas oficiales de W3CRM, sin marcado inventado:
 *
 *   - `(email)/app-calender` (que delega en `components/calendar/EventCalendar.jsx`)
 *     para la parte de agenda: `animated fadeIn demo-app` > `Row` > `Col lg={3}`
 *     con la `Card` de `card-header border-0 pb-0` + `h4.card-intro-title mb-0`
 *     y el panel `#external-events` con sus `fc-event external-event light btn-*`;
 *     y `Col lg={9}` con la `Card` que envuelve `demo-app-calendar#mycalendartest`
 *     y el `<FullCalendar>` con su `headerToolbar`, `rerenderDelay`,
 *     `eventDurationEditable`, `editable`, `droppable`, los tres plugins y
 *     `weekends`.
 *   - `(apps)/customer` para la tabla de gestion: `col-xl-12 bst-seller` >
 *     `d-flex align-items-center justify-content-between mb-4` + `h4.heading` >
 *     `card` > `card-body p-0` > `table-responsive active-projects style-1` >
 *     `tbl-caption` > `dataTables_wrapper no-footer` > `table shorting`.
 *
 * Una cita NO es solo un punto en el calendario: tiene acciones por fila
 * (confirmar, completar, cancelar, eliminar) que el calendario no puede
 * expresar. Por eso se conservan las dos pantallas, cada una con su marcado
 * original, en lugar de inventar un componente mixto.
 *
 * Se reutiliza lo ya migrado en vez de duplicarlo: `SaasW3crmShell`,
 * `W3crmPageTitle`, `W3crmRowDropdown` (de `(apps)/user`), `W3crmEmptyState` y
 * las mismas dependencias de FullCalendar y sweetalert2 que instalo
 * `/saas/calendar`. La adaptacion `initialView` (v6) frente a `defaultView`
 * (v5, la que usa la plantilla) es la misma y por el mismo motivo.
 *
 * A diferencia de `/saas/calendar`, aqui SI existe endpoint de borrado
 * (`DELETE /api/saas/citas/[id]`), asi que el dialogo de sweetalert2 conserva
 * la accion "Remove Event" de la plantilla, conectada al borrado real.
 *
 * Logica de NELVYON intacta: `GET/POST /api/saas/citas`,
 * `PATCH/DELETE /api/saas/citas/[id]`, el tipo `Appointment`, los estados
 * `ApptStatus` con `STATUS_LABELS`, el catalogo `DURATIONS`, los filtros
 * `upcoming | today | all`, el recuento `stats`, `load`, `changeStatus` y
 * `removeAppointment`. Sesion, RBAC (`workflows.read` / `workflows.write`),
 * tenant y permisos siguen resolviendose en el servidor, sin cambios.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, Col, Row } from "react-bootstrap";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import Alert from "sweetalert2";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmRowDropdown } from "@/features/saas-w3crm/components/W3crmUserTabs";

// ─── Tipos y catalogos (sin cambios respecto a la version anterior) ────────────

type ApptStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";

interface Appointment {
  id: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  title: string;
  notes: string | null;
  status: ApptStatus;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  assignedTo: string | null;
  meetingUrl: string | null;
}

const STATUS_LABELS: Record<ApptStatus, string> = {
  scheduled: "Programada",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

/** Estilo de W3CRM por estado: badge de la tabla y color del evento. */
const STATUS_CONFIG: Record<ApptStatus, { estilo: string; color: string }> = {
  scheduled: { estilo: "primary", color: "#6366f1" },
  confirmed: { estilo: "success", color: "#10b981" },
  completed: { estilo: "dark", color: "#6c757d" },
  cancelled: { estilo: "danger", color: "#ef4444" },
  no_show: { estilo: "warning", color: "#f59e0b" },
};

/**
 * Un estado fuera de catalogo (backend nuevo, dato antiguo) no puede dejar la
 * pantalla en blanco: se degrada a un badge neutro con la etiqueta cruda.
 */
const ESTADO_DESCONOCIDO = { estilo: "secondary", color: "#6c757d" };
function estadoDe(s: ApptStatus | string) {
  return STATUS_CONFIG[s as ApptStatus] ?? ESTADO_DESCONOCIDO;
}
function etiquetaEstado(s: ApptStatus | string) {
  return STATUS_LABELS[s as ApptStatus] ?? String(s || "Sin estado");
}

const DURATIONS = [15, 30, 45, 60, 90, 120];

/** Una fecha invalida o ausente no debe reventar `toLocaleString`. */
function fechaValida(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(iso: string) {
  const d = fechaValida(iso);
  if (!d) return "—";
  return d.toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Escapa el texto que se inyecta como HTML en el dialogo de sweetalert2. */
function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

type ViewMode = "upcoming" | "all" | "today";

const VISTAS: { id: ViewMode; label: string; estilo: string }[] = [
  { id: "upcoming", label: "Próximas", estilo: "primary" },
  { id: "today", label: "Hoy", estilo: "warning" },
  { id: "all", label: "Todas", estilo: "secondary" },
];

export default function SaasCitasPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [view, setView] = useState<ViewMode>("upcoming");
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Formulario de alta (mismos campos y validaciones que el modal anterior).
  const [title, setTitle] = useState("Reunión de consultoría");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [startAt, setStartAt] = useState("");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const calendarComponentRef = useRef<FullCalendar | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/saas/citas?limit=100");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = (await res.json().catch(() => ({}))) as { appointments?: Appointment[] };
      setAppointments(Array.isArray(data.appointments) ? data.appointments : []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "No se pudieron cargar las citas");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function crearCita(e: React.FormEvent) {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !startAt) {
      setFormError("Nombre, email y fecha son obligatorios");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const start = new Date(startAt);
      const end = new Date(start.getTime() + duration * 60_000);
      const res = await fetch("/api/saas/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim() || null,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          durationMinutes: duration,
          notes: notes.trim() || null,
          meetingUrl: meetingUrl.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Error al crear");
      }
      setShowNew(false);
      setContactName(""); setContactEmail(""); setContactPhone("");
      setStartAt(""); setNotes(""); setMeetingUrl("");
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, status: ApptStatus) {
    setUpdatingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/saas/citas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Error al actualizar la cita");
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al actualizar la cita");
    } finally {
      setUpdatingId(null);
    }
  }

  async function removeAppointment(id: string) {
    setUpdatingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/saas/citas/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Error al eliminar la cita");
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al eliminar la cita");
    } finally {
      setUpdatingId(null);
    }
  }

  const now = new Date();
  const todayStr = now.toDateString();

  const filtered = appointments.filter((a) => {
    const d = fechaValida(a.startAt);
    if (!d) return view === "all";
    if (view === "today") return d.toDateString() === todayStr;
    if (view === "upcoming") return d >= now && a.status !== "cancelled";
    return true;
  });

  const stats = {
    total: appointments.length,
    today: appointments.filter((a) => fechaValida(a.startAt)?.toDateString() === todayStr).length,
    upcoming: appointments.filter((a) => {
      const d = fechaValida(a.startAt);
      return !!d && d >= now && a.status !== "cancelled";
    }).length,
    completed: appointments.filter((a) => a.status === "completed").length,
  };

  const contadorVista: Record<ViewMode, number> = {
    upcoming: stats.upcoming,
    today: stats.today,
    all: stats.total,
  };

  /** Citas en el formato que espera FullCalendar. */
  const calendarEvents = filtered
    .filter((a) => !!fechaValida(a.startAt))
    .map((a) => ({
      id: a.id,
      title: a.title || a.contactName || "Cita",
      start: a.startAt,
      end: fechaValida(a.endAt) ? a.endAt : undefined,
      backgroundColor: estadoDe(a.status).color,
      borderColor: estadoDe(a.status).color,
      extendedProps: { citaId: a.id },
    }));

  /**
   * Dialogo de la plantilla, con su "Remove Event" conectado al borrado real.
   */
  const eventClick = (info: { event: { extendedProps: Record<string, unknown> } }) => {
    const cita = appointments.find((a) => a.id === String(info.event.extendedProps.citaId ?? ""));
    if (!cita) return;
    void Alert.fire({
      title: cita.title || "Cita",
      html: `
        <div class="table-responsive">
          <table class="table">
            <tbody>
              <tr><td>Contacto</td><td><strong>${esc(cita.contactName)}</strong></td></tr>
              <tr><td>Email</td><td><strong>${esc(cita.contactEmail)}</strong></td></tr>
              <tr><td>Inicio</td><td><strong>${esc(formatDate(cita.startAt))}</strong></td></tr>
              <tr><td>Duración</td><td><strong>${esc(cita.durationMinutes)} min</strong></td></tr>
              <tr><td>Estado</td><td><strong>${esc(etiquetaEstado(cita.status))}</strong></td></tr>
            </tbody>
          </table>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Remove Event",
      cancelButtonText: "Cerrar",
    }).then((result) => {
      if (result.value) void removeAppointment(cita.id);
    });
  };

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Citas" parentTitle="Gestión" pageTitle="Citas" />
      <div className="container-fluid">
        {loadError && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {loadError}
            <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setLoadError(null)} />
          </div>
        )}
        {actionError && (
          <div className="alert alert-warning alert-dismissible fade show" role="alert">
            {actionError}
            <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setActionError(null)} />
          </div>
        )}

        <div className="animated fadeIn demo-app">
          <Row>
            <Col lg={3}>
              <Card>
                <div className="card-header border-0 pb-0">
                  <h4 className="card-intro-title mb-0">Agenda</h4>
                </div>
                <Card.Body>
                  <div id="external-events">
                    <p>Filtra la agenda o crea una cita nueva</p>
                    {VISTAS.map((v) => (
                      <div
                        key={v.id}
                        className={`fc-event external-event light btn-${v.estilo} ${view === v.id ? "active" : ""}`}
                        data-class={`bg-${v.estilo}`}
                        role="button"
                        tabIndex={0}
                        title={v.label}
                        onClick={() => setView(v.id)}
                        onKeyDown={(e) => { if (e.key === "Enter") setView(v.id); }}
                      >
                        <i className="fa fa-move" />
                        <span>{v.label} ({contadorVista[v.id]})</span>
                      </div>
                    ))}
                    <div className="fc-event external-event light btn-dark" data-class="bg-dark" title="Completadas">
                      <i className="fa fa-move" />
                      <span>Completadas ({stats.completed})</span>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              <Card>
                <div className="card-header border-0 pb-0">
                  <h4 className="card-intro-title mb-0">Nueva cita</h4>
                </div>
                <Card.Body>
                  {showNew ? (
                    <form onSubmit={crearCita} data-testid="form-cita">
                      {formError && <div className="alert alert-danger py-2 fs-14" role="alert">{formError}</div>}
                      <div className="mb-3">
                        <label className="form-label" htmlFor="cita-titulo">Título *</label>
                        <input id="cita-titulo" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} />
                      </div>
                      <div className="mb-3">
                        <label className="form-label" htmlFor="cita-nombre">Nombre contacto *</label>
                        <input id="cita-nombre" className="form-control" placeholder="María García" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                      </div>
                      <div className="mb-3">
                        <label className="form-label" htmlFor="cita-email">Email contacto *</label>
                        <input id="cita-email" type="email" className="form-control" placeholder="maria@empresa.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                      </div>
                      <div className="mb-3">
                        <label className="form-label" htmlFor="cita-telefono">Teléfono</label>
                        <input id="cita-telefono" type="tel" className="form-control" placeholder="+34 600 000 000" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                      </div>
                      <div className="mb-3">
                        <label className="form-label" htmlFor="cita-fecha">Fecha y hora *</label>
                        <input id="cita-fecha" type="datetime-local" className="form-control" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                      </div>
                      <div className="mb-3">
                        <label className="form-label" htmlFor="cita-duracion">Duración</label>
                        <select id="cita-duracion" className="form-control" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                          {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label" htmlFor="cita-enlace">Enlace de reunión</label>
                        <input id="cita-enlace" type="url" className="form-control" placeholder="https://meet.google.com/…" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
                      </div>
                      <div className="mb-3">
                        <label className="form-label" htmlFor="cita-notas">Notas internas</label>
                        <textarea id="cita-notas" className="form-control" rows={3} placeholder="Contexto para la reunión…" value={notes} onChange={(e) => setNotes(e.target.value)} />
                      </div>
                      <div className="d-flex gap-2">
                        <button type="button" className="btn btn-primary light btn-sm" onClick={() => setShowNew(false)}>Cancelar</button>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                          {saving ? "Guardando…" : "Crear cita"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    // Un solo disparador en toda la pantalla, el de la cabecera de
                    // la tabla (misma posicion que "+ Add Customer" en
                    // `(apps)/customer`). Dos botones con el mismo nombre
                    // accesible son ambiguos para lector de pantalla y para test.
                    <p className="mb-0 fs-14 text-muted">
                      Usa <strong>+ Nueva cita</strong> para agendar una reunión.
                    </p>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col lg={9}>
              <Card>
                <Card.Body>
                  {loading ? (
                    <div className="d-flex align-items-center justify-content-center py-5" role="status">
                      <div className="spinner-border text-primary me-3" aria-hidden="true" />
                      <span className="text-muted">Cargando citas…</span>
                    </div>
                  ) : (
                    <div className="demo-app-calendar" id="mycalendartest">
                      <FullCalendar
                        // `initialView` en v6; la plantilla usa `defaultView`, de v5.
                        initialView="dayGridMonth"
                        headerToolbar={{
                          start: "prev,next today",
                          center: "title",
                          end: "dayGridMonth,timeGridWeek,timeGridDay",
                        }}
                        rerenderDelay={10}
                        eventDurationEditable={false}
                        editable={true}
                        droppable={true}
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        ref={calendarComponentRef}
                        weekends={true}
                        events={calendarEvents}
                        eventClick={eventClick}
                        locale="es"
                        buttonText={{ today: "Hoy", month: "Mes", week: "Semana", day: "Día" }}
                      />
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>

        <div className="row">
          <div className="col-xl-12 bst-seller">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h4 className="heading mb-0">Citas</h4>
              <div className="d-flex align-items-center">
                <button type="button" className="btn btn-primary btn-sm ms-2" onClick={() => setShowNew(true)}>
                  + Nueva cita
                </button>
              </div>
            </div>
            <div className="card">
              <div className="card-body p-0">
                <div className="table-responsive active-projects style-1 dt-filter exports">
                  <div className="tbl-caption">
                    <h4 className="heading mb-0">{VISTAS.find((v) => v.id === view)?.label ?? "Todas"}</h4>
                  </div>
                  <div id="citas-tbl_wrapper" className="dataTables_wrapper no-footer">
                    {loading ? (
                      <div className="d-flex align-items-center justify-content-center py-5" role="status">
                        <div className="spinner-border text-primary me-3" aria-hidden="true" />
                        <span className="text-muted">Cargando citas…</span>
                      </div>
                    ) : filtered.length === 0 ? (
                      <W3crmEmptyState
                        title="Sin citas"
                        description={view === "today" ? "No hay citas programadas para hoy" : "No hay citas que mostrar"}
                      />
                    ) : (
                      <table id="citas-tbl" className="table shorting">
                        <thead>
                          <tr>
                            <th>Cita</th>
                            <th>Contacto</th>
                            <th>Inicio</th>
                            <th>Duración</th>
                            <th>Estado</th>
                            <th className="text-end">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((a) => (
                            <tr key={a.id}>
                              <td>
                                <span className="fw-bold">{a.title || "—"}</span>
                                {a.notes ? <div className="text-muted fs-12">{a.notes}</div> : null}
                              </td>
                              <td>
                                <span>{a.contactName || "—"}</span>
                                <div className="text-muted fs-12">{a.contactEmail || "—"}</div>
                              </td>
                              <td><span>{formatDate(a.startAt)}</span></td>
                              <td><span>{a.durationMinutes ?? 0} min</span></td>
                              <td>
                                <span className={`badge badge-${estadoDe(a.status).estilo}`}>
                                  {etiquetaEstado(a.status)}
                                </span>
                              </td>
                              <td className="text-end">
                                {a.meetingUrl ? (
                                  <a href={a.meetingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary light btn-sm me-2">
                                    Unirse
                                  </a>
                                ) : null}
                                <W3crmRowDropdown etiqueta={`Acciones de ${a.title || a.contactName || "la cita"}`}>
                                  <button
                                    type="button"
                                    className="dropdown-item"
                                    disabled={updatingId === a.id || a.status === "confirmed" || a.status === "completed" || a.status === "cancelled"}
                                    onClick={() => void changeStatus(a.id, "confirmed")}
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    type="button"
                                    className="dropdown-item"
                                    disabled={updatingId === a.id || a.status === "completed" || a.status === "cancelled"}
                                    onClick={() => void changeStatus(a.id, "completed")}
                                  >
                                    Completar
                                  </button>
                                  <button
                                    type="button"
                                    className="dropdown-item"
                                    disabled={updatingId === a.id || a.status === "completed" || a.status === "cancelled"}
                                    onClick={() => void changeStatus(a.id, "cancelled")}
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    className="dropdown-item text-danger"
                                    disabled={updatingId === a.id}
                                    onClick={() => {
                                      void Alert.fire({
                                        title: "¿Eliminar esta cita?",
                                        text: "Esta acción no se puede deshacer.",
                                        icon: "warning",
                                        showCancelButton: true,
                                        confirmButtonColor: "#d33",
                                        cancelButtonColor: "#3085d6",
                                        confirmButtonText: "Eliminar",
                                        cancelButtonText: "Cancelar",
                                      }).then((r) => { if (r.value) void removeAppointment(a.id); });
                                    }}
                                  >
                                    Eliminar
                                  </button>
                                </W3crmRowDropdown>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
