"use client";

/**
 * /saas/calendar sobre la pantalla `(email)/app-calender` de la plantilla
 * oficial W3CRM, que delega en `components/calendar/EventCalendar.jsx`.
 *
 * Marcado de la plantilla, tal cual: `animated fadeIn demo-app` > `Row` >
 * `Col lg={3}` con la `Card` de `card-header border-0 pb-0` +
 * `h4.card-intro-title mb-0` y el panel `#external-events` con sus
 * `fc-event external-event light btn-*`; y `Col lg={9}` con la `Card` que
 * envuelve `demo-app-calendar#mycalendartest` y el `<FullCalendar>` con su
 * `headerToolbar`, `rerenderDelay`, `eventDurationEditable`, `editable`,
 * `droppable`, los tres plugins y `weekends`.
 *
 * Dos adaptaciones tecnicas obligadas, ambas sin efecto visual:
 *
 *   1. La plantilla usa `defaultView`, que es API de FullCalendar v5. En la v6
 *      instalada (6.1.21) la propiedad se llama `initialView`; con el nombre
 *      antiguo el calendario no arranca. Mismo valor, `dayGridMonth`.
 *   2. El `eventClick` de la plantilla ofrece "Remove Event" y llama a
 *      `event.remove()`. NELVYON no expone endpoint de borrado en
 *      `/api/saas/calendar`, y crear uno seria tocar backend. El dialogo de
 *      sweetalert2 se conserva con los datos del evento y solo el boton de
 *      cierre.
 *
 * Logica de NELVYON intacta: `/api/saas/calendar` con su GET por rango y su
 * POST de alta, los tipos `EventType`, `CalEvent` y `ApiCalEvent`,
 * `TYPE_CONFIG`, `apiToCal`, los catorce `useState`, `loadEvents` y
 * `createEvent`.
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

type EventType = "appointment" | "campaign" | "task" | "deadline";

interface CalEvent {
  id: string;
  title: string;
  type: EventType;
  date: string;
  time?: string;
  duration?: number;
  color: string;
  contactName?: string;
  assignedTo?: string;
}

const TYPE_CONFIG: Record<EventType, { label: string; color: string; icon: string; estilo: string }> = {
  appointment: { label: "Cita", color: "#6366f1", icon: "📅", estilo: "primary" },
  campaign: { label: "Campaña", color: "#f59e0b", icon: "📧", estilo: "warning" },
  task: { label: "Tarea", color: "#10b981", icon: "✓", estilo: "success" },
  deadline: { label: "Deadline", color: "#ef4444", icon: "⚠️", estilo: "danger" },
};

/** Un tipo fuera de catalogo no puede dejar la pantalla en blanco. */
const TIPO_DESCONOCIDO = { label: "Otro", color: "#6c757d", icon: "•", estilo: "secondary" };
function tipoDe(t: EventType | string) {
  return TYPE_CONFIG[t as EventType] ?? TIPO_DESCONOCIDO;
}

type ApiCalEvent = {
  id: string; title: string; type: EventType | "reminder";
  eventDate: string; eventTime: string | null;
  durationMinutes: number | null; color: string | null;
  assignedTo: string | null;
};

function apiToCal(e: ApiCalEvent): CalEvent {
  const type = (e.type === "reminder" ? "task" : e.type) as EventType;
  return {
    id: e.id, title: e.title, type,
    date: e.eventDate, time: e.eventTime ?? undefined,
    duration: e.durationMinutes ?? undefined,
    color: e.color ?? tipoDe(type).color,
    assignedTo: e.assignedTo ?? undefined,
  };
}

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function SaasCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [filterType, setFilterType] = useState<EventType | "all">("all");
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<EventType>("appointment");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("10:00");
  const [saving, setSaving] = useState(false);
  const calendarComponentRef = useRef<FullCalendar | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const to = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;
      const res = await fetch(`/api/saas/calendar?from=${from}&to=${to}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = (await res.json()) as { events?: ApiCalEvent[] };
      setEvents(Array.isArray(d.events) ? d.events.map(apiToCal) : []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "No se pudieron cargar los eventos");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { void loadEvents(); }, [loadEvents]);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/saas/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          type: newType,
          event_date: newDate,
          event_time: newTime || null,
          duration_minutes: newType === "appointment" ? 60 : null,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewTitle("");
        await loadEvents();
      }
    } finally {
      setSaving(false);
    }
  }

  const filtered = events.filter((e) => filterType === "all" || e.type === filterType);

  /** Eventos en el formato que espera FullCalendar. */
  const calendarEvents = filtered.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.time ? `${e.date}T${e.time}` : e.date,
    backgroundColor: e.color,
    borderColor: e.color,
    extendedProps: { tipo: e.type, asignado: e.assignedTo },
  }));

  /** Dialogo de la plantilla, sin la accion de borrado (ver cabecera). */
  const eventClick = (info: { event: { title: string; start: Date | null; extendedProps: Record<string, unknown> } }) => {
    const inicio = info.event.start ? info.event.start.toLocaleString("es-ES") : "—";
    const tipo = tipoDe(String(info.event.extendedProps.tipo ?? ""));
    void Alert.fire({
      title: info.event.title,
      html: `
        <div class="table-responsive">
          <table class="table">
            <tbody>
              <tr><td>Título</td><td><strong>${info.event.title}</strong></td></tr>
              <tr><td>Tipo</td><td><strong>${tipo.label}</strong></td></tr>
              <tr><td>Inicio</td><td><strong>${inicio}</strong></td></tr>
            </tbody>
          </table>
        </div>
      `,
      showCancelButton: false,
      confirmButtonColor: "#3085d6",
      confirmButtonText: "Cerrar",
    });
  };

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Calendario" parentTitle="Principal" pageTitle="Calendario" />
      <div className="container-fluid">
        {loadError && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {loadError}
            <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setLoadError(null)} />
          </div>
        )}

        <div className="animated fadeIn demo-app">
          <Row>
            <Col lg={3}>
              <Card>
                <div className="card-header border-0 pb-0">
                  <h4 className="card-intro-title mb-0">Calendario</h4>
                </div>
                <Card.Body>
                  <div id="external-events">
                    <p>Filtra por tipo o crea un evento nuevo</p>
                    <div
                      className={`fc-event external-event light btn-secondary ${filterType === "all" ? "active" : ""}`}
                      role="button"
                      tabIndex={0}
                      title="Todos"
                      onClick={() => setFilterType("all")}
                      onKeyDown={(e) => { if (e.key === "Enter") setFilterType("all"); }}
                    >
                      <i className="fa fa-move" />
                      <span>Todos ({events.length})</span>
                    </div>
                    {(Object.keys(TYPE_CONFIG) as EventType[]).map((t) => {
                      const cfg = tipoDe(t);
                      const n = events.filter((e) => e.type === t).length;
                      return (
                        <div
                          key={t}
                          className={`fc-event external-event light btn-${cfg.estilo} ${filterType === t ? "active" : ""}`}
                          data-class={`bg-${cfg.estilo}`}
                          role="button"
                          tabIndex={0}
                          title={cfg.label}
                          onClick={() => setFilterType(t)}
                          onKeyDown={(e) => { if (e.key === "Enter") setFilterType(t); }}
                        >
                          <i className="fa fa-move" />
                          <span>{cfg.icon} {cfg.label} ({n})</span>
                        </div>
                      );
                    })}
                  </div>
                </Card.Body>
              </Card>

              <Card>
                <div className="card-header border-0 pb-0">
                  <h4 className="card-intro-title mb-0">Nuevo evento</h4>
                </div>
                <Card.Body>
                  {showCreate ? (
                    <form onSubmit={createEvent} data-testid="form-evento">
                      <div className="mb-3">
                        <label className="form-label" htmlFor="ev-titulo">Título *</label>
                        <input id="ev-titulo" className="form-control" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                      </div>
                      <div className="mb-3">
                        <label className="form-label" htmlFor="ev-tipo">Tipo</label>
                        <select id="ev-tipo" className="form-control" value={newType} onChange={(e) => setNewType(e.target.value as EventType)}>
                          {(Object.keys(TYPE_CONFIG) as EventType[]).map((t) => (
                            <option key={t} value={t}>{tipoDe(t).label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label" htmlFor="ev-fecha">Fecha *</label>
                        <input id="ev-fecha" type="date" className="form-control" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                      </div>
                      <div className="mb-3">
                        <label className="form-label" htmlFor="ev-hora">Hora</label>
                        <input id="ev-hora" type="time" className="form-control" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
                      </div>
                      <div className="d-flex gap-2">
                        <button type="button" className="btn btn-primary light btn-sm" onClick={() => setShowCreate(false)}>Cancelar</button>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !newTitle.trim() || !newDate}>
                          {saving ? "Creando…" : "Crear evento"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                      + Nuevo evento
                    </button>
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
                      <span className="text-muted">Cargando {MONTHS[month]} {year}…</span>
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
                        datesSet={(info) => {
                          // El rango que pinta FullCalendar manda sobre el estado local,
                          // para que `loadEvents` pida siempre el mes visible.
                          const d = info.view.currentStart;
                          if (d.getFullYear() !== year) setYear(d.getFullYear());
                          if (d.getMonth() !== month) setMonth(d.getMonth());
                        }}
                      />
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
