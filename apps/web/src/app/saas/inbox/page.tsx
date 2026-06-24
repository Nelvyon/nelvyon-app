"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type Channel = "email" | "sms" | "whatsapp" | "instagram" | "facebook" | "chat";

interface Message {
  id: string;
  direction: "in" | "out";
  content: string;
  createdAt: string;
  status?: "sent" | "delivered" | "read";
}

interface Conversation {
  id: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  channel: Channel;
  lastMessage: string;
  lastAt: string;
  unread: number;
  assignedTo: string | null;
  tags: string[];
  messages: Message[];
  open: boolean;
}

const CH: Record<Channel, { label: string; icon: string; color: string }> = {
  email: { label: "Email", icon: "📧", color: "text-blue-400" },
  sms: { label: "SMS", icon: "💬", color: "text-green-400" },
  whatsapp: { label: "WhatsApp", icon: "📱", color: "text-emerald-400" },
  instagram: { label: "Instagram", icon: "📸", color: "text-pink-400" },
  facebook: { label: "Facebook", icon: "👥", color: "text-blue-500" },
  chat: { label: "Chat", icon: "💭", color: "text-purple-400" },
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

const STATUS_ICON: Record<string, string> = { sent: "✓", delivered: "✓✓", read: "✓✓" };

export default function SaasInboxPage() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [filterChannel, setFilterChannel] = useState<Channel | "all">("all");
  const [filterUnread, setFilterUnread] = useState(false);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/inbox");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = (await res.json()) as { conversations?: Conversation[] };
      const list = d.conversations ?? [];
      setConvs(list);
      if (list.length > 0 && !selected) setSelected(list[0]!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar bandeja");
      setConvs([]);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [selected]);

  const [replyInfo, setReplyInfo] = useState<{ dispatched: boolean; error?: string } | null>(null);

  async function sendReply() {
    if (!reply.trim() || !selected) return;
    const newMsg: Message = { id: Date.now().toString(), direction: "out", content: reply, createdAt: new Date().toISOString(), status: "sent" };
    setConvs(prev => prev.map(c => c.id === selected.id ? { ...c, messages: [...c.messages, newMsg], lastMessage: reply, lastAt: new Date().toISOString(), unread: 0 } : c));
    setSelected(s => s ? ({ ...s, messages: [...s.messages, newMsg], lastMessage: reply }) : s);
    const body = reply;
    setReply("");
    setReplyInfo(null);
    try {
      const res = await fetch(`/api/saas/inbox/${selected.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({})) as { channel_dispatched?: boolean; channel_error?: string };
      setReplyInfo({ dispatched: data.channel_dispatched ?? false, error: data.channel_error ?? undefined });
    } catch {
      // optimistic update already applied
    }
  }

  async function closeConversation(id: string) {
    await fetch(`/api/saas/inbox/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    setConvs(prev => prev.map(c => c.id === id ? { ...c, open: false } : c));
    if (selected?.id === id) setSelected(null);
  }

  function markRead(id: string) {
    setConvs(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
    if (selected?.id === id) setSelected(s => s ? ({ ...s, unread: 0 }) : s);
  }

  const filtered = convs.filter(c => {
    if (filterChannel !== "all" && c.channel !== filterChannel) return false;
    if (filterUnread && c.unread === 0) return false;
    if (search && !c.contactName.toLowerCase().includes(search.toLowerCase()) && !c.lastMessage.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalUnread = convs.reduce((s, c) => s + c.unread, 0);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="inbox" />}>
            {/* Header */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-foreground">Bandeja unificada</h1>
                <p className="text-xs text-muted-foreground">Email, SMS, WhatsApp, Instagram y más — todo en un lugar</p>
              </div>
              <div className="flex items-center gap-2">
                {totalUnread > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{totalUnread} sin leer</span>}
                {error && <span className="text-xs text-red-400">{error}</span>}
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/30" />
                ))}
              </div>
            ) : convs.length === 0 ? (
              <NelvyonDsCard className="p-16 text-center">
                <p className="text-4xl">📭</p>
                <p className="mt-4 font-semibold text-foreground">Bandeja vacía</p>
                <p className="mt-2 text-sm text-muted-foreground">No hay conversaciones todavía. Los mensajes entrantes aparecerán aquí.</p>
              </NelvyonDsCard>
            ) : (
              <div className="flex h-[calc(100vh-200px)] overflow-hidden rounded-2xl border border-border">
                {/* Conversation list */}
                <div className="flex w-80 shrink-0 flex-col border-r border-border">
                  {/* Filters */}
                  <div className="space-y-2 border-b border-border p-3">
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conversación…"
                      className="h-8 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none" />
                    <div className="flex flex-wrap gap-1">
                      <button onClick={() => setFilterChannel("all")} className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${filterChannel === "all" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}`}>Todos</button>
                      {(Object.keys(CH) as Channel[]).map(ch => (
                        <button key={ch} onClick={() => setFilterChannel(ch)} className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${filterChannel === ch ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}`}>
                          {CH[ch].icon}
                        </button>
                      ))}
                      <button onClick={() => setFilterUnread(f => !f)} className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${filterUnread ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}`}>No leídos</button>
                    </div>
                  </div>

                  {/* List */}
                  <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <p className="p-4 text-center text-xs text-muted-foreground">Sin conversaciones</p>
                    ) : filtered.map(c => (
                      <button key={c.id} onClick={() => { setSelected(c); markRead(c.id); }}
                        className={`flex w-full items-start gap-3 border-b border-border p-3 text-left transition-colors ${selected?.id === c.id ? "bg-primary/10" : "hover:bg-muted/10"}`}>
                        <div className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {c.contactName[0]}
                          <span className={`absolute -bottom-0.5 -right-0.5 text-[10px] ${CH[c.channel].color}`}>{CH[c.channel].icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-xs font-semibold truncate ${c.unread > 0 ? "text-foreground" : "text-foreground/80"}`}>{c.contactName}</p>
                            <p className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(c.lastAt)}</p>
                          </div>
                          <p className={`mt-0.5 truncate text-[11px] ${c.unread > 0 ? "text-foreground" : "text-muted-foreground"}`}>{c.lastMessage}</p>
                          {c.unread > 0 && (
                            <span className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">{c.unread}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat panel */}
                {selected ? (
                  <div className="flex flex-1 flex-col min-w-0">
                    {/* Contact header */}
                    <div className="flex items-center gap-3 border-b border-border px-5 py-3">
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                        {selected.contactName[0]}
                        <span className={`absolute -bottom-0.5 -right-0.5 text-sm ${CH[selected.channel].color}`}>{CH[selected.channel].icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{selected.contactName}</p>
                        <p className="text-xs text-muted-foreground">{selected.contactEmail ?? selected.contactPhone ?? CH[selected.channel].label}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {selected.tags.map(t => <span key={t} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">{t}</span>)}
                        <NelvyonDsButton variant="ghost" className="text-xs">📋 Ver contacto</NelvyonDsButton>
                        <NelvyonDsButton variant="ghost" className="text-xs">📅 Cita</NelvyonDsButton>
                        <NelvyonDsButton variant="ghost" className="text-xs">⋯</NelvyonDsButton>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto space-y-3 p-5">
                      {selected.messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.direction === "out" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-md rounded-2xl px-4 py-2.5 text-sm ${msg.direction === "out" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted/30 text-foreground rounded-bl-sm"}`}>
                            <p className="leading-relaxed">{msg.content}</p>
                            <div className={`mt-1 flex items-center gap-1 text-[10px] ${msg.direction === "out" ? "justify-end text-primary-foreground/70" : "text-muted-foreground"}`}>
                              <span>{fmtTime(msg.createdAt)}</span>
                              {msg.status && <span className={msg.status === "read" ? "text-blue-300" : ""}>{STATUS_ICON[msg.status]}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Channel dispatch feedback */}
                    {replyInfo && (
                      <div className={`mx-4 mt-1 rounded-lg px-3 py-1.5 text-xs ${replyInfo.error ? "bg-yellow-500/10 text-yellow-400" : "bg-green-500/10 text-green-400"}`}>
                        {replyInfo.error ? `⚠ ${replyInfo.error}` : replyInfo.dispatched ? `✓ Enviado vía ${CH[selected.channel].label}` : `✓ Guardado (canal no despachado)`}
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
                            placeholder={`Responder vía ${CH[selected.channel].label}… (Enter para enviar)`}
                            rows={2}
                            className="w-full resize-none rounded-xl bg-transparent px-4 py-3 text-sm text-foreground focus:outline-none"
                          />
                          <div className="flex items-center gap-2 border-t border-border px-4 py-2">
                            <button className="text-xs text-muted-foreground hover:text-foreground">📎</button>
                            <button className="text-xs text-muted-foreground hover:text-foreground">😊</button>
                            <button className="text-xs text-muted-foreground hover:text-foreground">✂️ Snippet</button>
                            <button className="text-xs text-muted-foreground hover:text-foreground">📅 Cita</button>
                          </div>
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

                {/* Right panel — contact info */}
                {selected && (
                  <div className="hidden w-64 shrink-0 flex-col gap-4 border-l border-border p-4 xl:flex">
                    <div className="text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">{selected.contactName[0]}</div>
                      <p className="mt-2 font-semibold text-foreground">{selected.contactName}</p>
                      {selected.contactEmail && <p className="text-xs text-muted-foreground">{selected.contactEmail}</p>}
                      {selected.contactPhone && <p className="text-xs text-muted-foreground">{selected.contactPhone}</p>}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Asignado a</p>
                      <p className="text-sm text-foreground">{selected.assignedTo ?? "Sin asignar"}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Canal</p>
                      <p className={`text-sm font-medium ${CH[selected.channel].color}`}>{CH[selected.channel].icon} {CH[selected.channel].label}</p>
                    </div>
                    {selected.tags.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Etiquetas</p>
                        <div className="flex flex-wrap gap-1">{selected.tags.map(t => <span key={t} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">{t}</span>)}</div>
                      </div>
                    )}
                    <div className="space-y-1.5 mt-2">
                      <NelvyonDsButton variant="ghost" className="w-full text-xs">📋 Ver en CRM</NelvyonDsButton>
                      <NelvyonDsButton variant="ghost" className="w-full text-xs">📅 Agendar cita</NelvyonDsButton>
                      <NelvyonDsButton variant="ghost" className="w-full text-xs">✉️ Enviar campaña</NelvyonDsButton>
                      <NelvyonDsButton variant="ghost" className="w-full text-xs" onClick={() => selected && closeConversation(selected.id)}>✓ Cerrar conversación</NelvyonDsButton>
                    </div>
                  </div>
                )}
              </div>
            )}
    </SaasShellLayout>
  );
}
