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

const STATUS_TONE: Record<ApptStatus, "primary" | "success" | "warning" | "danger"> = {
  scheduled: "primary",
  confirmed: "success",
  completed: "success",
  cancelled: "danger",
  no_show: "warning",
};

const DURATIONS = [15, 30, 45, 60, 90, 120];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── New appointment modal ─────────────────────────────────────────────────────

function NewApptModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("Reunión de consultoría");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [startAt, setStartAt] = useState("");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !startAt) {
      setError("Nombre, email y fecha son obligatorios");
      return;
    }
    setSaving(true);
    setError(null);
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
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Nueva cita</h2>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Título *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre contacto *</label>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="María García"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email contacto *</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="maria@empresa.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Teléfono</label>
              <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+34 600 000 000"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Duración</label>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Fecha y hora *</label>
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Enlace de reunión (Zoom, Meet…)</label>
            <input type="url" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Notas internas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Contexto para la reunión…"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Guardando…" : "Crear cita"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ViewMode = "upcoming" | "all" | "today";

export default function SaasCitasPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [view, setView] = useState<ViewMode>("upcoming");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/citas?limit=100");
      const data = (await res.json().catch(() => ({ appointments: [] }))) as { appointments: Appointment[] };
      setAppointments(data.appointments ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const now = new Date();
  const todayStr = now.toDateString();

  const filtered = appointments.filter((a) => {
    const d = new Date(a.startAt);
    if (view === "today") return d.toDateString() === todayStr;
    if (view === "upcoming") return d >= now && a.status !== "cancelled";
    return true;
  });

  const stats = {
    total: appointments.length,
    today: appointments.filter((a) => new Date(a.startAt).toDateString() === todayStr).length,
    upcoming: appointments.filter((a) => new Date(a.startAt) >= now && a.status !== "cancelled").length,
    completed: appointments.filter((a) => a.status === "completed").length,
  };

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="formularios" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader
            title="Agenda y Citas"
            subtitle="Gestión de reuniones, llamadas y citas con clientes"
          />
          <NelvyonDsButton onClick={() => setShowNew(true)}>+ Nueva cita</NelvyonDsButton>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: stats.total },
            { label: "Hoy", value: stats.today },
            { label: "Próximas", value: stats.upcoming },
            { label: "Completadas", value: stats.completed },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(["upcoming", "today", "all"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {v === "upcoming" ? "Próximas" : v === "today" ? "Hoy" : "Todas"}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/30" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-5xl">📅</p>
            <p className="mt-4 text-lg font-semibold text-foreground">Sin citas</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {view === "today" ? "No hay citas programadas para hoy" : "No hay citas próximas"}
            </p>
            <NelvyonDsButton className="mt-5" onClick={() => setShowNew(true)}>+ Nueva cita</NelvyonDsButton>
          </NelvyonDsCard>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((a) => (
              <NelvyonDsCard key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{a.title}</p>
                      <NelvyonDsBadge tone={STATUS_TONE[a.status]}>
                        {STATUS_LABELS[a.status]}
                      </NelvyonDsBadge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {a.contactName} — {a.contactEmail}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>🕐 {formatDate(a.startAt)}</span>
                      <span>⏱ {a.durationMinutes} min</span>
                      {a.meetingUrl && (
                        <a
                          href={a.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          🔗 Unirse
                        </a>
                      )}
                    </div>
                    {a.notes && <p className="mt-1 text-xs text-muted-foreground italic">{a.notes}</p>}
                  </div>
                </div>
              </NelvyonDsCard>
            ))}
          </div>
        )}
      </div>

      {showNew && <NewApptModal onClose={() => setShowNew(false)} onSaved={load} />}
    </SaasShellLayout>
  );
}
