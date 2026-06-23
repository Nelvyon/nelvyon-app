"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type Priority = "low" | "medium" | "high" | "urgent";
type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface Ticket {
  id: string; subject: string; description: string;
  status: TicketStatus; priority: Priority;
  contactName: string; contactEmail: string;
  assignedTo: string | null; createdAt: string; updatedAt: string;
  messageCount: number;
}

const PRIORITY_COLOR: Record<Priority, string> = {
  low: "text-muted-foreground", medium: "text-yellow-400",
  high: "text-orange-400", urgent: "text-red-400"
};
const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Baja", medium: "Media", high: "Alta", urgent: "Urgente"
};
const STATUS_TONE: Record<TicketStatus, "primary" | "success" | "warning" | "danger"> = {
  open: "warning", in_progress: "primary", resolved: "success", closed: "success"
};
const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Abierto", in_progress: "En curso", resolved: "Resuelto", closed: "Cerrado"
};

function NewTicketModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [subject, setSubject] = useState("");
  const [desc, setDesc] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !contactEmail.trim()) { setError("Asunto y email son obligatorios"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/helpdesk_tickets/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), description: desc.trim(), contactName: contactName.trim(), contactEmail: contactEmail.trim(), priority }),
      });
      if (!res.ok) throw new Error("Error al crear ticket");
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Nuevo ticket</h2>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Asunto *</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Error al acceder al módulo de campañas"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre contacto</label>
              <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="María García"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email *</label>
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="maria@empresa.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Prioridad</label>
            <div className="flex gap-2">
              {(["low", "medium", "high", "urgent"] as Priority[]).map(p => (
                <button key={p} type="button" onClick={() => setPriority(p)}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${priority === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Descripción</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Describe el problema con detalle…"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Creando…" : "Crear ticket"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SaasHelpdeskPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/helpdesk_tickets/tickets");
      const data = (await res.json().catch(() => ({ tickets: [] }))) as { tickets: Ticket[] };
      setTickets(data.tickets ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);
  const open = tickets.filter(t => t.status === "open").length;
  const urgent = tickets.filter(t => t.priority === "urgent" && t.status !== "resolved" && t.status !== "closed").length;

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="crm" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader title="Helpdesk / Soporte" subtitle="Gestiona tickets de soporte de tus clientes desde un solo lugar" />
          <NelvyonDsButton onClick={() => setShowNew(true)}>+ Nuevo ticket</NelvyonDsButton>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total tickets", value: tickets.length },
            { label: "Abiertos", value: open },
            { label: "Urgentes", value: urgent, red: urgent > 0 },
            { label: "Resueltos hoy", value: tickets.filter(t => t.status === "resolved").length },
          ].map(({ label, value, red }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${red ? "text-red-400" : "text-foreground"}`}>{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {([["all", "Todos"], ["open", "Abiertos"], ["in_progress", "En curso"], ["resolved", "Resueltos"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filter === v ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
              {l}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/30" />)}</div>
        ) : filtered.length === 0 ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-5xl">🎉</p>
            <p className="mt-4 text-lg font-semibold text-foreground">Sin tickets pendientes</p>
            <p className="mt-2 text-sm text-muted-foreground">Todos los tickets están al día</p>
          </NelvyonDsCard>
        ) : (
          <div className="space-y-2">
            {filtered.map(t => (
              <NelvyonDsCard key={t.id} className="p-4 hover:border-primary/30 transition-colors cursor-pointer">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase ${PRIORITY_COLOR[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
                      <span className="text-muted-foreground">·</span>
                      <p className="font-medium text-foreground">{t.subject}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.contactName} · {t.contactEmail} · {t.messageCount} mensaje{t.messageCount !== 1 ? "s" : ""}</p>
                  </div>
                  <NelvyonDsBadge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</NelvyonDsBadge>
                </div>
              </NelvyonDsCard>
            ))}
          </div>
        )}
      </div>
      {showNew && <NewTicketModal onClose={() => setShowNew(false)} onSaved={load} />}
    </SaasShellLayout>
  );
}
