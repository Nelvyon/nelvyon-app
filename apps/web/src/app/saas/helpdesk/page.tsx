"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type Priority   = "low" | "medium" | "high" | "urgent";
type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type SlaPolicy  = "standard" | "priority" | "urgent";

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

const PRIORITY_COLOR: Record<Priority, string> = {
  low: "text-muted-foreground", medium: "text-yellow-400", high: "text-orange-400", urgent: "text-red-400"
};
const PRIORITY_LABEL: Record<Priority, string> = { low: "Baja", medium: "Media", high: "Alta", urgent: "Urgente" };
const STATUS_TONE: Record<TicketStatus, "primary" | "success" | "warning" | "danger"> = {
  open: "warning", in_progress: "primary", resolved: "success", closed: "success"
};
const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Abierto", in_progress: "En curso", resolved: "Resuelto", closed: "Cerrado"
};
const SLA_LABEL: Record<SlaPolicy, string> = { standard: "Estándar (4h/24h)", priority: "Prioritario (1h/8h)", urgent: "Urgente (30m/4h)" };
const inp = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none";

function slaStatus(due: string | null, done: string | null): "ok" | "risk" | "breached" | null {
  if (!due) return null;
  if (done) return "ok";
  const diff = new Date(due).getTime() - Date.now();
  if (diff < 0) return "breached";
  if (diff < 30 * 60000) return "risk";
  return "ok";
}
function fmtDue(due: string | null): string {
  if (!due) return "—";
  return new Date(due).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
}

// ── New Ticket Modal ──────────────────────────────────────────────────────────
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
        body: JSON.stringify({ subject: subject.trim(), description: desc.trim(), contactName: contactName.trim(), contactEmail: contactEmail.trim(), priority, slaPolicy }),
      });
      const d = await res.json() as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error al crear ticket"); return; }
      onSaved(); onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Nuevo ticket</h2>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={save} className="space-y-4">
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Asunto *</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Error al acceder al módulo…" className={inp} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre contacto</label>
              <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="María García" className={inp} /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Email *</label>
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="maria@empresa.com" className={inp} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Prioridad</label>
              <div className="flex gap-1.5">
                {(["low","medium","high","urgent"] as Priority[]).map(p => (
                  <button key={p} type="button" onClick={() => setPriority(p)}
                    className={`flex-1 rounded-lg border py-1.5 text-xs font-medium ${priority === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                    {PRIORITY_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Política SLA</label>
              <select value={slaPolicy} onChange={e => setSlaPolicy(e.target.value as SlaPolicy)} className={inp}>
                {(["standard","priority","urgent"] as SlaPolicy[]).map(s => <option key={s} value={s}>{SLA_LABEL[s]}</option>)}
              </select>
            </div>
          </div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Descripción</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Creando…" : "Crear ticket"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Ticket Detail Panel ───────────────────────────────────────────────────────
function TicketDetail({ ticket, macros, onClose, onUpdated }: { ticket: Ticket; macros: Macro[]; onClose: () => void; onUpdated: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await fetch(`/api/saas/helpdesk?id=${ticket.id}`);
      const d = await res.json() as { messages?: Message[] };
      setMessages(d.messages ?? []);
      setLoading(false);
    })();
  }, [ticket.id]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setSendingMsg(true);
    await fetch("/api/saas/helpdesk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "message", ticket_id: ticket.id, body: newMsg.trim() }) });
    setNewMsg("");
    setSendingMsg(false);
    const res = await fetch(`/api/saas/helpdesk?id=${ticket.id}`);
    const d = await res.json() as { messages?: Message[] };
    setMessages(d.messages ?? []);
  }

  async function changeStatus(status: TicketStatus) {
    await fetch("/api/saas/helpdesk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", id: ticket.id, status }) });
    onUpdated(); onClose();
  }

  async function applyMacro(macroId: string) {
    await fetch("/api/saas/helpdesk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "apply-macro", ticketId: ticket.id, macroId }) });
    onUpdated(); onClose();
  }

  const slaDue = slaStatus(ticket.resolutionDue, ticket.resolvedAt);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto bg-card border-l border-border shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="font-semibold text-foreground text-sm line-clamp-1">{ticket.subject}</p>
            <p className="text-xs text-muted-foreground">{ticket.contactName} · {ticket.contactEmail}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-4">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status + Priority */}
          <div className="flex flex-wrap gap-2">
            <NelvyonDsBadge tone={STATUS_TONE[ticket.status]}>{STATUS_LABEL[ticket.status]}</NelvyonDsBadge>
            <span className={`text-xs font-bold uppercase ${PRIORITY_COLOR[ticket.priority]}`}>{PRIORITY_LABEL[ticket.priority]}</span>
            {ticket.slaBreached && <NelvyonDsBadge tone="danger">SLA Incumplido</NelvyonDsBadge>}
          </div>

          {/* SLA */}
          <div className="rounded-lg bg-muted/10 border border-border p-3 text-xs space-y-1">
            <p className="font-medium text-foreground text-xs mb-1">SLA — {SLA_LABEL[ticket.slaPolicy]}</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-muted-foreground">Primera respuesta</p>
                <p className={`font-medium ${slaStatus(ticket.firstResponseDue, ticket.firstRespondedAt) === "breached" ? "text-red-400" : "text-foreground"}`}>{fmtDue(ticket.firstResponseDue)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Resolución</p>
                <p className={`font-medium ${slaDue === "breached" ? "text-red-400" : slaDue === "risk" ? "text-amber-400" : "text-foreground"}`}>{fmtDue(ticket.resolutionDue)}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {(["open","in_progress","resolved","closed"] as TicketStatus[]).filter(s => s !== ticket.status).map(s => (
              <button key={s} onClick={() => void changeStatus(s)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                → {STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          {/* Macros */}
          {macros.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Macros</p>
              <div className="flex flex-wrap gap-2">
                {macros.map(m => (
                  <button key={m.id} onClick={() => void applyMacro(m.id)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    ⚡ {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">Conversación ({messages.length})</p>
            {loading ? <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/20" />)}</div> : (
              <div className="space-y-3">
                {messages.map(m => (
                  <div key={m.id} className={`rounded-lg p-3 text-sm ${m.isInternal ? "bg-amber-500/5 border border-amber-500/20" : "bg-muted/10 border border-border"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground text-xs">{m.author}{m.isInternal ? " · 🔒 interno" : ""}</span>
                      <span className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</span>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reply */}
          <form onSubmit={sendMessage} className="space-y-2">
            <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)} rows={3} placeholder="Escribe una respuesta…"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            <NelvyonDsButton type="submit" disabled={sendingMsg || !newMsg.trim()} className="w-full">{sendingMsg ? "Enviando…" : "Responder"}</NelvyonDsButton>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SaasHelpdeskPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, mRes] = await Promise.all([
        fetch("/api/saas/helpdesk"),
        fetch("/api/saas/helpdesk?resource=macros"),
      ]);
      if (tRes.ok) { const d = await tRes.json() as { tickets?: Ticket[] }; setTickets(d.tickets ?? []); }
      if (mRes.ok) { const d = await mRes.json() as { macros?: Macro[] };  setMacros(d.macros ?? []); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);
  const open     = tickets.filter(t => t.status === "open").length;
  const urgent   = tickets.filter(t => t.priority === "urgent" && t.status !== "resolved" && t.status !== "closed").length;
  const breached = tickets.filter(t => t.slaBreached).length;

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="helpdesk" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader title="Helpdesk / Soporte" subtitle="Tickets con SLA, macros y conversaciones por thread" />
          <NelvyonDsButton onClick={() => setShowNew(true)}>+ Nuevo ticket</NelvyonDsButton>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total tickets", value: String(tickets.length) },
            { label: "Abiertos",      value: String(open),    red: open > 0 },
            { label: "Urgentes",      value: String(urgent),  red: urgent > 0 },
            { label: "SLA incumplido",value: String(breached),red: breached > 0 },
          ].map(({ label, value, red }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${red ? "text-red-400" : "text-foreground"}`}>{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {([["all","Todos"],["open","Abiertos"],["in_progress","En curso"],["resolved","Resueltos"],["closed","Cerrados"]] as const).map(([v, l]) => (
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
              <NelvyonDsCard key={t.id} className="cursor-pointer p-4 hover:border-primary/30 transition-colors" onClick={() => setSelected(t)}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold uppercase ${PRIORITY_COLOR[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
                      <span className="text-muted-foreground text-xs">·</span>
                      <p className="font-medium text-foreground text-sm">{t.subject}</p>
                      {t.slaBreached && <NelvyonDsBadge tone="danger">SLA ⚠</NelvyonDsBadge>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t.contactName} · {t.contactEmail} · {t.messageCount} mens.
                      {t.resolutionDue && <span className={slaStatus(t.resolutionDue, t.resolvedAt) === "breached" ? " text-red-400" : " text-muted-foreground"}> · Due: {fmtDue(t.resolutionDue)}</span>}
                    </p>
                  </div>
                  <NelvyonDsBadge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</NelvyonDsBadge>
                </div>
              </NelvyonDsCard>
            ))}
          </div>
        )}
      </div>
      {showNew && <NewTicketModal onClose={() => setShowNew(false)} onSaved={load} />}
      {selected && <TicketDetail ticket={selected} macros={macros} onClose={() => setSelected(null)} onUpdated={load} />}
    </SaasShellLayout>
  );
}
