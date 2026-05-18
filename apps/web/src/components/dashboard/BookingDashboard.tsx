"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AvailabilityConfig, Booking, DayInterval } from "../../../../../backend/saas/BookingService";

type TabId = "availability" | "bookings" | "new";

const DAYS: { key: keyof AvailabilityConfig; label: string }[] = [
  { key: "monday", label: "Lun" },
  { key: "tuesday", label: "Mar" },
  { key: "wednesday", label: "Mié" },
  { key: "thursday", label: "Jue" },
  { key: "friday", label: "Vie" },
  { key: "saturday", label: "Sáb" },
  { key: "sunday", label: "Dom" },
];

function statusBadgeClass(status: Booking["status"]): string {
  if (status === "confirmed") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  if (status === "cancelled") return "bg-red-500/20 text-red-300 border-red-500/40";
  return "bg-amber-500/20 text-amber-200 border-amber-500/40";
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function startWeekdayMonday(year: number, monthIndex: number): number {
  const d = new Date(year, monthIndex, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export default function BookingDashboard() {
  const [tab, setTab] = useState<TabId>("availability");
  const [statusMsg, setStatusMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [slotDuration, setSlotDuration] = useState(30);
  const [timezone, setTimezone] = useState("Europe/Madrid");
  const [dayRanges, setDayRanges] = useState<Record<string, { start: string; end: string; enabled: boolean }>>(
    () => ({
      monday: { start: "09:00", end: "17:00", enabled: true },
      tuesday: { start: "09:00", end: "17:00", enabled: true },
      wednesday: { start: "09:00", end: "17:00", enabled: true },
      thursday: { start: "09:00", end: "17:00", enabled: true },
      friday: { start: "09:00", end: "17:00", enabled: true },
      saturday: { start: "", end: "", enabled: false },
      sunday: { start: "", end: "", enabled: false },
    }),
  );

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [nbName, setNbName] = useState("");
  const [nbEmail, setNbEmail] = useState("");
  const [nbPhone, setNbPhone] = useState("");
  const [nbDate, setNbDate] = useState("");
  const [nbTime, setNbTime] = useState("10:00");
  const [nbNotes, setNbNotes] = useState("");

  const [reminderText, setReminderText] = useState<Record<string, string>>({});

  const monthLabel = useMemo(
    () => new Date(calYear, calMonth, 1).toLocaleString("es", { month: "long", year: "numeric" }),
    [calYear, calMonth],
  );

  const fromTo = useMemo(() => {
    const fromDate = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-01`;
    const last = daysInMonth(calYear, calMonth);
    const toDate = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
    return { fromDate, toDate };
  }, [calYear, calMonth]);

  const loadAvailability = useCallback(async () => {
    const res = await fetch("/api/saas/booking/availability");
    if (!res.ok) return;
    const data = (await res.json()) as { availability: AvailabilityConfig | null };
    const a = data.availability;
    if (!a) return;
    setSlotDuration(a.slotDuration);
    setTimezone(a.timezone);
    setDayRanges((prev) => {
      const next = { ...prev };
      for (const { key } of DAYS) {
        const intervals = a[key] as DayInterval[] | undefined;
        if (intervals && intervals[0]) {
          next[key as string] = {
            start: intervals[0].start,
            end: intervals[0].end,
            enabled: true,
          };
        } else {
          next[key as string] = { start: "09:00", end: "17:00", enabled: false };
        }
      }
      return next;
    });
  }, []);

  const loadBookings = useCallback(async () => {
    const q = new URLSearchParams({ fromDate: fromTo.fromDate, toDate: fromTo.toDate });
    const res = await fetch(`/api/saas/booking/list?${q.toString()}`);
    if (!res.ok) throw new Error("list_failed");
    const data = (await res.json()) as { bookings: Booking[] };
    setBookings(data.bookings ?? []);
  }, [fromTo.fromDate, fromTo.toDate]);

  useEffect(() => {
    if (tab === "availability") loadAvailability().catch(() => setStatusMsg("No se pudo cargar disponibilidad"));
  }, [tab, loadAvailability]);

  useEffect(() => {
    if (tab === "bookings" || tab === "new")
      loadBookings().catch(() => setStatusMsg("No se pudieron cargar citas"));
  }, [tab, loadBookings]);

  async function saveAvailability(): Promise<void> {
    setLoading(true);
    setStatusMsg("");
    try {
      const config: AvailabilityConfig = {
        slotDuration,
        timezone: timezone.trim(),
      };
      for (const { key } of DAYS) {
        const r = dayRanges[key as string];
        if (r?.enabled && r.start && r.end) {
          (config as Record<string, unknown>)[key] = [{ start: r.start, end: r.end }];
        }
      }
      const res = await fetch("/api/saas/booking/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("save_failed");
      setStatusMsg("Disponibilidad guardada");
    } catch {
      setStatusMsg("Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  async function createManualBooking(): Promise<void> {
    if (!nbName.trim() || !nbEmail.trim() || !nbDate || !nbTime) {
      setStatusMsg("Nombre, email, fecha y hora son obligatorios");
      return;
    }
    setLoading(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/saas/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: nbName.trim(),
          clientEmail: nbEmail.trim(),
          clientPhone: nbPhone.trim() || undefined,
          date: nbDate,
          time: nbTime,
          notes: nbNotes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("create_failed");
      setStatusMsg("Cita creada");
      setNbName("");
      setNbEmail("");
      setNbPhone("");
      setNbNotes("");
      await loadBookings();
    } catch {
      setStatusMsg("Error al crear cita");
    } finally {
      setLoading(false);
    }
  }

  async function sendReminder(bookingId: string): Promise<void> {
    setStatusMsg("");
    try {
      const res = await fetch("/api/saas/booking/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      if (!res.ok) throw new Error("reminder_failed");
      const data = (await res.json()) as { message: string };
      setReminderText((m) => ({ ...m, [bookingId]: data.message }));
      setStatusMsg("Recordatorio generado (copia el texto)");
    } catch {
      setStatusMsg("Error al generar recordatorio");
    }
  }

  const bookingsByDate = useMemo(() => {
    const m: Record<string, Booking[]> = {};
    for (const b of bookings) {
      if (!m[b.date]) m[b.date] = [];
      m[b.date].push(b);
    }
    return m;
  }, [bookings]);

  const calCells = useMemo(() => {
    const first = startWeekdayMonday(calYear, calMonth);
    const n = daysInMonth(calYear, calMonth);
    const cells: (number | null)[] = [];
    for (let i = 0; i < first; i += 1) cells.push(null);
    for (let d = 1; d <= n; d += 1) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calYear, calMonth]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Agenda & citas</h1>
          <p className="mt-2 text-sm text-slate-400">
            Disponibilidad, reservas online y recordatorios — tu mini-Calendly SaaS.
          </p>
        </header>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          {(
            [
              ["availability", "Disponibilidad"],
              ["bookings", "Citas"],
              ["new", "Nueva Cita"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                tab === id ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800"
              }`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {statusMsg && <p className="mb-4 text-center text-sm text-slate-400">{statusMsg}</p>}

        {tab === "availability" && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-slate-400">Duración del slot (min)</span>
                <input
                  type="number"
                  min={10}
                  step={5}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(Number(e.target.value) || 30)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Zona horaria</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="Europe/Madrid"
                />
              </label>
            </div>
            <div className="space-y-3">
              {DAYS.map(({ key, label }) => {
                const r = dayRanges[key as string] ?? { start: "09:00", end: "17:00", enabled: false };
                return (
                  <div key={key} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                    <label className="flex min-w-[140px] items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={r.enabled}
                        onChange={(e) =>
                          setDayRanges((prev) => ({
                            ...prev,
                            [key]: { ...r, enabled: e.target.checked },
                          }))
                        }
                        className="rounded border-slate-600"
                      />
                      <span className="font-medium text-slate-300">{label}</span>
                    </label>
                    <input
                      type="time"
                      disabled={!r.enabled}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm disabled:opacity-40"
                      value={r.start}
                      onChange={(e) =>
                        setDayRanges((prev) => ({
                          ...prev,
                          [key]: { ...r, start: e.target.value },
                        }))
                      }
                    />
                    <span className="text-slate-500">→</span>
                    <input
                      type="time"
                      disabled={!r.enabled}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm disabled:opacity-40"
                      value={r.end}
                      onChange={(e) =>
                        setDayRanges((prev) => ({
                          ...prev,
                          [key]: { ...r, end: e.target.value },
                        }))
                      }
                    />
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 sm:w-auto sm:px-8"
              onClick={() => void saveAvailability()}
            >
              Guardar disponibilidad
            </button>
          </section>
        )}

        {tab === "bookings" && (
          <section className="grid gap-10 lg:grid-cols-[1fr_340px]">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="mb-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-slate-800 px-3 py-1 text-sm text-slate-200"
                  onClick={() => {
                    const d = new Date(calYear, calMonth - 1, 1);
                    setCalYear(d.getFullYear());
                    setCalMonth(d.getMonth());
                  }}
                >
                  ←
                </button>
                <h2 className="capitalize text-sm font-medium text-slate-300">{monthLabel}</h2>
                <button
                  type="button"
                  className="rounded-lg bg-slate-800 px-3 py-1 text-sm text-slate-200"
                  onClick={() => {
                    const d = new Date(calYear, calMonth + 1, 1);
                    setCalYear(d.getFullYear());
                    setCalMonth(d.getMonth());
                  }}
                >
                  →
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
                {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                  <div key={d} className="py-1 font-medium">
                    {d}
                  </div>
                ))}
                {calCells.map((d, i) => {
                  const iso =
                    d === null
                      ? null
                      : `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  const has = iso && bookingsByDate[iso]?.length;
                  return (
                    <div
                      key={i}
                      className={`relative min-h-[36px] rounded border border-slate-800 py-1 text-slate-300 ${
                        d === null ? "bg-transparent border-transparent" : "bg-slate-950/80"
                      }`}
                    >
                      {d !== null && <span className="text-sm">{d}</span>}
                      {has ? (
                        <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-indigo-500" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500">Lista del mes</h3>
              <ul className="max-h-[480px] space-y-3 overflow-y-auto pr-1">
                {bookings.length === 0 ? (
                  <li className="text-sm text-slate-500">No hay citas en este rango.</li>
                ) : (
                  bookings.map((b) => (
                    <li key={b.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-white">{b.clientName}</p>
                          <p className="text-xs text-slate-400">
                            {b.date} {b.time}
                          </p>
                          <p className="text-xs text-slate-500">{b.clientEmail}</p>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${statusBadgeClass(b.status)}`}>
                          {b.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
                        onClick={() => void sendReminder(b.id)}
                      >
                        Enviar recordatorio
                      </button>
                      {reminderText[b.id] && (
                        <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-slate-950 p-2 text-xs text-slate-300">
                          {reminderText[b.id]}
                        </pre>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </section>
        )}

        {tab === "new" && (
          <section className="mx-auto max-w-lg rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <label className="mb-3 block text-sm">
              <span className="text-slate-400">Nombre</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                value={nbName}
                onChange={(e) => setNbName(e.target.value)}
              />
            </label>
            <label className="mb-3 block text-sm">
              <span className="text-slate-400">Email</span>
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                value={nbEmail}
                onChange={(e) => setNbEmail(e.target.value)}
              />
            </label>
            <label className="mb-3 block text-sm">
              <span className="text-slate-400">Teléfono</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                value={nbPhone}
                onChange={(e) => setNbPhone(e.target.value)}
              />
            </label>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-slate-400">Fecha</span>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  value={nbDate}
                  onChange={(e) => setNbDate(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Hora</span>
                <input
                  type="time"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  value={nbTime}
                  onChange={(e) => setNbTime(e.target.value)}
                />
              </label>
            </div>
            <label className="mb-4 block text-sm">
              <span className="text-slate-400">Notas</span>
              <textarea
                className="mt-1 min-h-[80px] w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                value={nbNotes}
                onChange={(e) => setNbNotes(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              onClick={() => void createManualBooking()}
            >
              Crear cita
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
