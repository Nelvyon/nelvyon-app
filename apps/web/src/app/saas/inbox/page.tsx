"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type Channel = "email" | "sms" | "whatsapp" | "instagram" | "facebook" | "chat";
type Priority = "low" | "normal" | "high" | "urgent";

interface Conversation {
  id: string;
  contactId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  channel: Channel;
  status: string;
  priority: Priority;
  assignedTo: string | null;
  threadId: string | null;
  subject: string | null;
  firstResponseAt: string | null;
  slaDueAt: string | null;
  slaBreached: boolean;
  unreadCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiMessage {
  id: string;
  direction: "inbound" | "outbound";
  channel: string | null;
  body: string;
  status: string;
  createdAt: string;
}

interface Thread {
  threadId: string;
  contactId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  channels: Channel[];
  conversationCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  hasBreached: boolean;
  earliestSlaDue: string | null;
}

interface TeamMember { id: string; name: string | null; email: string; role: string; status: string; }

const CH: Record<Channel, { label: string; icon: string; color: string }> = {
  email: { label: "Email", icon: "📧", color: "text-blue-400" },
  sms: { label: "SMS", icon: "💬", color: "text-green-400" },
  whatsapp: { label: "WhatsApp", icon: "📱", color: "text-emerald-400" },
  instagram: { label: "Instagram", icon: "📸", color: "text-pink-400" },
  facebook: { label: "Facebook", icon: "👥", color: "text-blue-500" },
  chat: { label: "Chat", icon: "💭", color: "text-purple-400" },
};

const PRIORITY_BADGE: Record<Priority, string> = {
  low: "bg-gray-500/20 text-gray-400",
  normal: "bg-blue-500/20 text-blue-400",
  high: "bg-yellow-500/20 text-yellow-400",
  urgent: "bg-red-500/20 text-red-400",
};

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000) return "ahora";
  if (d < 3600000) return `${Math.floor(d / 60000)}m`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h`;
  return `${Math.floor(d / 86400000)}d`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function slaColor(conv: Conversation): string {
  if (conv.slaBreached) return "bg-red-500/20 text-red-400";
  if (!conv.slaDueAt) return "bg-muted/20 text-muted-foreground";
  const diff = new Date(conv.slaDueAt).getTime() - Date.now();
  if (diff < 0) return "bg-red-500/20 text-red-400";
  if (diff < 30 * 60_000) return "bg-yellow-500/20 text-yellow-400";
  return "bg-green-500/20 text-green-400";
}

function slaLabel(conv: Conversation): string {
  if (conv.slaBreached) return "SLA ❌";
  if (!conv.slaDueAt) return "";
  const diff = new Date(conv.slaDueAt).getTime() - Date.now();
  if (diff < 0) return "SLA ❌";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `SLA ${mins}m`;
  return `SLA ${Math.floor(mins / 60)}h`;
}

export default function SaasInboxPage() {
  const [view, setView] = useState<"conversations" | "threads">("conversations");
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [replyInfo, setReplyInfo] = useState<{ dispatched: boolean; error?: string } | null>(null);
  const [filterChannel, setFilterChannel] = useState<Channel | "all">("all");
  const [filterSla, setFilterSla] = useState(false);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // KPI counters
  const totalOpen = convs.filter(c => c.status === "open").length;
  const totalAtRisk = convs.filter(c => c.status === "open" && (!c.firstResponseAt) && c.slaDueAt && new Date(c.slaDueAt).getTime() - Date.now() < 30 * 60_000).length;
  const totalBreached = convs.filter(c => c.slaBreached).length;

  const loadConvs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = filterSla ? "/api/saas/inbox?sla=at_risk" : "/api/saas/inbox";
      const [convsRes, membersRes] = await Promise.all([
        fetch(url),
        fetch("/api/saas/team"),
      ]);
      if (!convsRes.ok) throw new Error(`Error ${convsRes.status}`);
      const d = await convsRes.json() as { conversations?: Conversation[] };
      setConvs(d.conversations ?? []);
      if (membersRes.ok) {
        const md = await membersRes.json() as { members?: TeamMember[] };
        setMembers(md.members ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [filterSla]);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/inbox?view=threads");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = await res.json() as { threads?: Thread[] };
      setThreads(d.threads ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "conversations") void loadConvs();
    else void loadThreads();
  }, [view, loadConvs, loadThreads]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function selectConv(conv: Conversation) {
    setSelected(conv);
    setMessages([]);
    setReplyInfo(null);
    setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/saas/inbox/${conv.id}/messages`);
      if (res.ok) {
        const d = await res.json() as { messages?: ApiMessage[] };
        setMessages(d.messages ?? []);
      }
    } finally {
      setLoadingMsgs(false);
    }
    // mark read locally
    setConvs(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
  }

  async function sendReply() {
    if (!reply.trim() || !selected) return;
    const body = reply.trim();
    setReply("");
    setReplyInfo(null);
    // optimistic
    const optMsg: ApiMessage = {
      id: `opt-${Date.now()}`, direction: "outbound", channel: selected.channel,
      body, status: "sent", createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optMsg]);
    try {
      const res = await fetch(`/api/saas/inbox/${selected.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({})) as { channel_dispatched?: boolean; channel_error?: string };
      setReplyInfo({ dispatched: data.channel_dispatched ?? false, error: data.channel_error ?? undefined });
    } catch { /* optimistic already applied */ }
  }

  async function closeConv(id: string) {
    await fetch(`/api/saas/inbox/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    setConvs(prev => prev.map(c => c.id === id ? { ...c, status: "closed" } : c));
    if (selected?.id === id) setSelected(s => s ? { ...s, status: "closed" } : s);
  }

  async function assignMember(memberId: string | null) {
    if (!selected) return;
    const res = await fetch(`/api/saas/inbox/${selected.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: memberId }),
    });
    if (res.ok) {
      const d = await res.json() as { conversation?: Conversation };
      if (d.conversation) {
        setConvs(prev => prev.map(c => c.id === selected.id ? d.conversation! : c));
        setSelected(d.conversation);
      }
    }
  }

  const filtered = convs.filter(c => {
    if (filterChannel !== "all" && c.channel !== filterChannel) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.contactName?.toLowerCase().includes(q) && !c.lastMessage?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const displayName = (c: Conversation) => c.contactName ?? c.contactEmail ?? c.contactPhone ?? "Desconocido";

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="inbox" />}>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Bandeja unificada</h1>
          <p className="text-xs text-muted-foreground">Email, SMS, WhatsApp, Instagram y más — hilos por contacto, SLA en tiempo real</p>
        </div>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>

      {/* SLA KPIs */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <NelvyonDsCard className="p-3">
          <p className="text-xs text-muted-foreground">Abiertas</p>
          <p className="text-2xl font-bold text-foreground">{totalOpen}</p>
        </NelvyonDsCard>
        <NelvyonDsCard className="p-3">
          <p className="text-xs text-muted-foreground">En riesgo SLA</p>
          <p className={`text-2xl font-bold ${totalAtRisk > 0 ? "text-yellow-400" : "text-foreground"}`}>{totalAtRisk}</p>
        </NelvyonDsCard>
        <NelvyonDsCard className="p-3">
          <p className="text-xs text-muted-foreground">SLA incumplido</p>
          <p className={`text-2xl font-bold ${totalBreached > 0 ? "text-red-400" : "text-foreground"}`}>{totalBreached}</p>
        </NelvyonDsCard>
      </div>

      {/* View tabs */}
      <div className="mb-3 flex gap-2">
        <button onClick={() => setView("conversations")} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${view === "conversations" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
          💬 Conversaciones
        </button>
        <button onClick={() => setView("threads")} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${view === "threads" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
          🧵 Hilos por contacto
        </button>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setFilterSla(f => !f)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterSla ? "bg-yellow-500/20 text-yellow-400" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
            ⏱ SLA en riesgo
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/30" />
          ))}
        </div>
      ) : view === "threads" ? (
        /* ── THREADS VIEW ─────────────────────────────────────────── */
        <div className="space-y-2">
          {threads.length === 0 ? (
            <NelvyonDsCard className="p-16 text-center">
              <p className="text-4xl">🧵</p>
              <p className="mt-4 font-semibold text-foreground">Sin hilos</p>
              <p className="mt-2 text-sm text-muted-foreground">Los hilos se crean automáticamente al agrupar conversaciones por contacto.</p>
            </NelvyonDsCard>
          ) : threads.map(t => (
            <NelvyonDsCard key={t.threadId} className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {(t.contactName ?? t.contactEmail ?? "?")[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{t.contactName ?? t.contactEmail ?? "Desconocido"}</p>
                  {t.hasBreached && <span className="rounded-md bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-400">SLA ❌</span>}
                  {t.earliestSlaDue && !t.hasBreached && (
                    <span className="rounded-md bg-yellow-500/20 px-1.5 py-0.5 text-[10px] text-yellow-400">
                      ⏱ {Math.floor((new Date(t.earliestSlaDue).getTime() - Date.now()) / 60_000)}m
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {t.channels.map(ch => (
                    <span key={ch} className="text-[11px]" title={CH[ch]?.label ?? ch}>{CH[ch]?.icon ?? ch}</span>
                  ))}
                  <span className="text-[11px] text-muted-foreground">{t.conversationCount} conv.</span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{t.lastMessage ?? "—"}</p>
              </div>
              <div className="text-right text-[11px] text-muted-foreground">
                {t.lastMessageAt ? timeAgo(t.lastMessageAt) : "—"}
              </div>
            </NelvyonDsCard>
          ))}
        </div>
      ) : convs.length === 0 ? (
        <NelvyonDsCard className="p-16 text-center">
          <p className="text-4xl">📭</p>
          <p className="mt-4 font-semibold text-foreground">Bandeja vacía</p>
          <p className="mt-2 text-sm text-muted-foreground">No hay conversaciones todavía.</p>
        </NelvyonDsCard>
      ) : (
        /* ── CONVERSATIONS VIEW ───────────────────────────────────── */
        <div className="flex h-[calc(100vh-330px)] overflow-hidden rounded-2xl border border-border">
          {/* List panel */}
          <div className="flex w-80 shrink-0 flex-col border-r border-border">
            <div className="space-y-2 border-b border-border p-3">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar…"
                className="h-8 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none" />
              <div className="flex flex-wrap gap-1">
                <button onClick={() => setFilterChannel("all")} className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${filterChannel === "all" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}`}>Todos</button>
                {(Object.keys(CH) as Channel[]).map(ch => (
                  <button key={ch} onClick={() => setFilterChannel(ch)} className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${filterChannel === ch ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}`}>
                    {CH[ch].icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">Sin resultados</p>
              ) : filtered.map(c => (
                <button key={c.id} onClick={() => void selectConv(c)}
                  className={`flex w-full items-start gap-3 border-b border-border p-3 text-left transition-colors ${selected?.id === c.id ? "bg-primary/10" : "hover:bg-muted/10"}`}>
                  <div className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {displayName(c)[0]?.toUpperCase()}
                    <span className={`absolute -bottom-0.5 -right-0.5 text-[10px] ${CH[c.channel]?.color ?? ""}`}>{CH[c.channel]?.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-xs font-semibold text-foreground">{displayName(c)}</p>
                      <p className="shrink-0 text-[10px] text-muted-foreground">{c.lastMessageAt ? timeAgo(c.lastMessageAt) : ""}</p>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{c.lastMessage ?? "—"}</p>
                    <div className="mt-1 flex gap-1">
                      {c.unreadCount > 0 && (
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">{c.unreadCount}</span>
                      )}
                      {slaLabel(c) && (
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${slaColor(c)}`}>{slaLabel(c)}</span>
                      )}
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${PRIORITY_BADGE[c.priority]}`}>{c.priority}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Thread/chat panel */}
          {selected ? (
            <div className="flex flex-1 flex-col min-w-0">
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-border px-5 py-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  {displayName(selected)[0]?.toUpperCase()}
                  <span className={`absolute -bottom-0.5 -right-0.5 text-sm ${CH[selected.channel]?.color ?? ""}`}>{CH[selected.channel]?.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{displayName(selected)}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.contactEmail ?? selected.contactPhone ?? CH[selected.channel]?.label}
                    {selected.subject && ` · ${selected.subject}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {slaLabel(selected) && (
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${slaColor(selected)}`}>{slaLabel(selected)}</span>
                  )}
                  <NelvyonDsButton variant="ghost" className="text-xs" onClick={() => void closeConv(selected.id)}>✓ Cerrar</NelvyonDsButton>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 p-5">
                {loadingMsgs ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-muted/20" />)}
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground">Sin mensajes aún</p>
                ) : messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-md rounded-2xl px-4 py-2.5 text-sm ${msg.direction === "outbound" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted/30 text-foreground rounded-bl-sm"}`}>
                      {msg.channel && msg.channel !== selected.channel && (
                        <span className="mb-1 block text-[10px] opacity-70">{CH[msg.channel as Channel]?.icon ?? msg.channel}</span>
                      )}
                      <p className="leading-relaxed">{msg.body}</p>
                      <p className={`mt-1 text-[10px] ${msg.direction === "outbound" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {fmtTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply feedback */}
              {replyInfo && (
                <div className={`mx-4 rounded-lg px-3 py-1.5 text-xs ${replyInfo.error ? "bg-yellow-500/10 text-yellow-400" : "bg-green-500/10 text-green-400"}`}>
                  {replyInfo.error ? `⚠ ${replyInfo.error}` : replyInfo.dispatched ? `✓ Enviado vía ${CH[selected.channel]?.label}` : "✓ Guardado"}
                </div>
              )}

              {/* Reply box */}
              <div className="border-t border-border p-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1 rounded-xl border border-border bg-background focus-within:border-primary">
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendReply(); } }}
                      placeholder={`Responder vía ${CH[selected.channel]?.label}… (Enter para enviar)`}
                      rows={2}
                      className="w-full resize-none rounded-xl bg-transparent px-4 py-3 text-sm text-foreground focus:outline-none"
                    />
                  </div>
                  <NelvyonDsButton onClick={() => void sendReply()} disabled={!reply.trim()} className="h-10 px-5">↗ Enviar</NelvyonDsButton>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
              Selecciona una conversación
            </div>
          )}

          {/* Right info panel */}
          {selected && (
            <div className="hidden w-64 shrink-0 flex-col gap-4 border-l border-border p-4 xl:flex overflow-y-auto">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                  {displayName(selected)[0]?.toUpperCase()}
                </div>
                <p className="mt-2 font-semibold text-foreground">{displayName(selected)}</p>
                {selected.contactEmail && <p className="text-xs text-muted-foreground">{selected.contactEmail}</p>}
                {selected.contactPhone && <p className="text-xs text-muted-foreground">{selected.contactPhone}</p>}
              </div>

              {/* SLA info */}
              {selected.slaDueAt && (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">SLA</p>
                  <span className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${slaColor(selected)}`}>{slaLabel(selected)}</span>
                  {selected.firstResponseAt && (
                    <p className="text-[11px] text-green-400">✓ 1ª resp. {timeAgo(selected.firstResponseAt)}</p>
                  )}
                </div>
              )}

              {/* Assign */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Asignado a</p>
                <select
                  value={selected.assignedTo ?? ""}
                  onChange={e => void assignMember(e.target.value || null)}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                >
                  <option value="">Sin asignar</option>
                  {members.filter(m => m.status === "active").map(m => (
                    <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
                  ))}
                </select>
                <NelvyonDsButton variant="ghost" className="w-full text-xs" onClick={() => void assignMember(null)}>
                  🔄 Round-robin
                </NelvyonDsButton>
              </div>

              {/* Channel */}
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Canal</p>
                <p className={`text-sm font-medium ${CH[selected.channel]?.color ?? ""}`}>
                  {CH[selected.channel]?.icon} {CH[selected.channel]?.label}
                </p>
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Prioridad</p>
                <span className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${PRIORITY_BADGE[selected.priority]}`}>
                  {selected.priority}
                </span>
              </div>

              <div className="space-y-1.5 mt-2">
                <NelvyonDsButton variant="ghost" className="w-full text-xs" onClick={() => void closeConv(selected.id)}>✓ Cerrar conversación</NelvyonDsButton>
              </div>
            </div>
          )}
        </div>
      )}
    </SaasShellLayout>
  );
}
