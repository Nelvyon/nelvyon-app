"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

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

const TYPE_CONFIG: Record<EventType, { label: string; color: string; icon: string }> = {
  appointment: { label: "Cita", color: "#6366f1", icon: "📅" },
  campaign: { label: "Campaña", color: "#f59e0b", icon: "📧" },
  task: { label: "Tarea", color: "#10b981", icon: "✓" },
  deadline: { label: "Deadline", color: "#ef4444", icon: "⚠️" },
};

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
    color: e.color ?? TYPE_CONFIG[type].color,
    assignedTo: e.assignedTo ?? undefined,
  };
}

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function SaasCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [view, setView] = useState<"month" | "week" | "list">("month");
  const [filterType, setFilterType] = useState<EventType | "all">("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<EventType>("appointment");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("10:00");
  const [saving, setSaving] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const last = getDaysInMonth(year, month);
    const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
    try {
      const res = await fetch(`/api/saas/calendar?from=${from}&to=${to}`);
      if (res.ok) {
        const d = await res.json() as { events?: ApiCalEvent[] };
        setEvents((d.events ?? []).map(apiToCal));
      }
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

  const filtered = events.filter(e => filterType === "all" || e.type === filterType);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function eventsForDay(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filtered.filter(e => e.date === dateStr);
  }

  const selectedEvents = selectedDay ? filtered.filter(e => e.date === selectedDay) : [];

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="calendar" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="Calendario" subtitle="Vista unificada de citas, campañas, tareas y deadlines" />
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {(["month", "week", "list"] as const).map(v => (
                    <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      {v === "month" ? "Mes" : v === "week" ? "Semana" : "Lista"}
                    </button>
                  ))}
                </div>
                <NelvyonDsButton onClick={() => setShowCreate(true)}>+ Evento</NelvyonDsButton>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterType("all")} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterType === "all" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}`}>Todos</button>
              {(Object.entries(TYPE_CONFIG) as [EventType, typeof TYPE_CONFIG[EventType]][]).map(([type, cfg]) => (
                <button key={type} onClick={() => setFilterType(type)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterType === type ? "text-white" : "bg-muted/30 text-muted-foreground"}`}
                  style={filterType === type ? { backgroundColor: cfg.color } : undefined}>
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                {/* Month nav */}
                <div className="mb-4 flex items-center justify-between">
                  <button onClick={prevMonth} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors">←</button>
                  <h2 className="text-lg font-bold text-foreground">{MONTHS[month]} {year}</h2>
                  <button onClick={nextMonth} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors">→</button>
                </div>

                {view === "month" && (
                  <NelvyonDsCard className="overflow-hidden p-0">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 border-b border-border bg-muted/20">
                      {DAYS.map(d => <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>)}
                    </div>
                    {/* Day cells */}
                    <div className="grid grid-cols-7">
                      {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-24 border-b border-r border-border bg-muted/5" />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const dayEvents = eventsForDay(day);
                        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                        const isSelected = selectedDay === dateStr;
                        return (
                          <div key={day} onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                            className={`h-24 cursor-pointer border-b border-r border-border p-1 transition-colors hover:bg-muted/10 ${isSelected ? "bg-primary/5" : ""}`}>
                            <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                              {day}
                            </div>
                            <div className="space-y-0.5">
                              {dayEvents.slice(0, 2).map(e => (
                                <div key={e.id} className="truncate rounded-sm px-1 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: e.color }}>
                                  {e.time && `${e.time} `}{e.title}
                                </div>
                              ))}
                              {dayEvents.length > 2 && <p className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} más</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </NelvyonDsCard>
                )}

                {view === "list" && (
                  <div className="space-y-2">
                    {filtered.sort((a, b) => a.date.localeCompare(b.date)).map(e => {
                      const cfg = TYPE_CONFIG[e.type];
                      return (
                        <NelvyonDsCard key={e.id} className="flex items-center gap-4 p-4">
                          <div className="h-12 w-12 shrink-0 flex items-center justify-center rounded-xl text-xl" style={{ backgroundColor: `${e.color}20` }}>
                            {cfg.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{e.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(e.date).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
                              {e.time && ` · ${e.time}`}
                              {e.duration && ` (${e.duration}min)`}
                              {e.contactName && ` · ${e.contactName}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <NelvyonDsBadge tone="primary">{cfg.label}</NelvyonDsBadge>
                            {e.assignedTo && <span className="text-xs text-muted-foreground">{e.assignedTo}</span>}
                          </div>
                        </NelvyonDsCard>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Selected day */}
                {selectedDay && (
                  <NelvyonDsCard className="overflow-hidden p-0">
                    <div className="border-b border-border bg-muted/20 px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">
                        {new Date(selectedDay).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
                      </p>
                    </div>
                    {selectedEvents.length === 0 ? (
                      <p className="p-4 text-center text-xs text-muted-foreground">Sin eventos este día</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {selectedEvents.map(e => (
                          <div key={e.id} className="flex items-start gap-3 p-3">
                            <div className="mt-0.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{e.title}</p>
                              {e.time && <p className="text-xs text-muted-foreground">{e.time}{e.duration && ` · ${e.duration}min`}</p>}
                              {e.contactName && <p className="text-xs text-primary">{e.contactName}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </NelvyonDsCard>
                )}

                {/* Upcoming */}
                <NelvyonDsCard className="overflow-hidden p-0">
                  <div className="border-b border-border bg-muted/20 px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">Próximos eventos</p>
                  </div>
                  <div className="divide-y divide-border">
                    {filtered.slice(0, 5).map(e => {
                      const cfg = TYPE_CONFIG[e.type];
                      return (
                        <div key={e.id} className="flex items-start gap-3 p-3">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm" style={{ backgroundColor: `${e.color}20` }}>
                            {cfg.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{e.title}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(e.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                              {e.time && ` · ${e.time}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </NelvyonDsCard>

                {/* Stats */}
                <NelvyonDsCard className="p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Este mes</p>
                  {(Object.entries(TYPE_CONFIG) as [EventType, typeof TYPE_CONFIG[EventType]][]).map(([type, cfg]) => {
                    const count = events.filter(e => e.type === type).length;
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                        <span className="flex-1 text-xs text-muted-foreground">{cfg.label}</span>
                        <span className="text-xs font-bold text-foreground">{count}</span>
                      </div>
                    );
                  })}
                </NelvyonDsCard>
              </div>
            </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={createEvent} className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Nuevo evento</h3>
            <div className="mt-4 space-y-3">
              <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Título" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
              <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={newType} onChange={(e) => setNewType(e.target.value as EventType)}>
                {(Object.keys(TYPE_CONFIG) as EventType[]).map((t) => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
              </select>
              <input type="date" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
              <input type="time" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
            </div>
            <div className="mt-4 flex gap-2">
              <NelvyonDsButton type="button" variant="ghost" className="flex-1" onClick={() => setShowCreate(false)}>Cancelar</NelvyonDsButton>
              <NelvyonDsButton type="submit" className="flex-1" disabled={saving}>{saving ? "Guardando…" : "Crear"}</NelvyonDsButton>
            </div>
          </form>
        </div>
      )}
    </SaasShellLayout>
  );
}
