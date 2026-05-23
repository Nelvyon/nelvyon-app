"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable, EliteModal } from "@/features/dashboard/components/DashboardTabs";

import { Button } from "@/core/ui/button";
import { dashboardCalendarApi } from "@/features/dashboard/api";

interface CalendarEvent {
  id?: string | number;
  title?: string;
  start?: string;
  start_at?: string;
  end?: string;
  end_at?: string;
}

export default function CalendarioDashboardPage() {
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [modal, setModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    start: "",
    end: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month, 0, 23, 59, 59).toISOString();
    const res = await dashboardCalendarApi.events(start, end);
    setEvents((res.items as CalendarEvent[]) ?? []);
    } catch {
      /* preserved */
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load().catch(() => setEvents([]));
  }, [load]);

  const monthLabel = useMemo(
    () => new Date(year, month - 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
    [year, month],
  );

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const raw = ev.start ?? ev.start_at;
      if (!raw) continue;
      const key = raw.slice(0, 10);
      map[key] = map[key] ?? [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  const calendarCells = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }

  async function createEvent() {
    await dashboardCalendarApi.create({
      title: form.title,
      description: form.description || undefined,
      start: form.start,
      end: form.end,
    });
    setModal(false);
    setForm({ title: "", description: "", start: "", end: "" });
    load();
  }

  async function syncCalendar() {
    setSyncing(true);
    try {
      await dashboardCalendarApi.sync();
      await load();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Calendario</h1>
            <p className="text-sm text-muted-foreground">Eventos y sincronización con Google Calendar</p>
          </div>
          <div className="flex gap-2">
            <Button disabled={syncing} onClick={syncCalendar} variant="outline">
              {syncing ? "Sincronizando…" : "Sincronizar"}
            </Button>
            <Button onClick={() => setModal(true)}>Nuevo evento</Button>
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="mb-4 flex items-center justify-between">
            <Button onClick={prevMonth} size="sm" variant="outline">
              ←
            </Button>
            <h2 className="font-semibold capitalize">{monthLabel}</h2>
            <Button onClick={nextMonth} size="sm" variant="outline">
              →
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarCells.map((day, i) => {
              const key = day ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
              const dayEvents = day ? eventsByDay[key] ?? [] : [];
              return (
                <div className="min-h-[80px] rounded border p-1 text-left text-xs" key={i}>
                  {day ? <span className="font-medium">{day}</span> : null}
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev, j) => (
                      <span className="block truncate rounded bg-primary/10 px-1 text-[10px] text-primary" key={String(ev.id ?? j)}>
                        {ev.title ?? "Evento"}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DashboardPageTransition>

      <EliteModal onClose={() => setModal(false)} open={modal} title="Nuevo evento">
        <div className="grid gap-3">
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Título"
            value={form.title}
          />
          <textarea
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descripción"
            rows={2}
            value={form.description}
          />
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, start: e.target.value })}
            type="datetime-local"
            value={form.start}
          />
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, end: e.target.value })}
            type="datetime-local"
            value={form.end}
          />
          <Button disabled={!form.title || !form.start || !form.end} onClick={createEvent}>
            Crear evento
          </Button>
        </div>
      </EliteModal>
    </ProtectedLayout>
  );
}
