"use client";

import { useEffect, useRef, useState } from "react";
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

const MOCK: Conversation[] = [
  {
    id: "c1", contactName: "María García", contactEmail: "maria@empresa.com", contactPhone: null,
    channel: "email", lastMessage: "Hola, ¿cuándo podemos agendar una llamada para ver la propuesta?",
    lastAt: new Date(Date.now() - 5 * 60000).toISOString(), unread: 2, assignedTo: "Admin", tags: ["lead-caliente"], open: true,
    messages: [
      { id: "m1", direction: "out", content: "Buenos días María, le enviamos la propuesta que acordamos.", createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), status: "read" },
      { id: "m2", direction: "in", content: "Muchas gracias, la revisaré hoy.", createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
      { id: "m3", direction: "in", content: "Hola, ¿cuándo podemos agendar una llamada para ver la propuesta?", createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
    ],
  },
  {
    id: "c2", contactName: "Carlos Méndez", contactEmail: null, contactPhone: "+34 612 345 678",
    channel: "whatsapp", lastMessage: "Perfecto, nos vemos el martes entonces 👍",
    lastAt: new Date(Date.now() - 20 * 60000).toISOString(), unread: 0, assignedTo: "Ventas", tags: ["cliente"], open: true,
    messages: [
      { id: "m4", direction: "out", content: "Carlos, ¿te va bien el martes a las 10h para la reunión de seguimiento?", createdAt: new Date(Date.now() - 3600000).toISOString(), status: "read" },
      { id: "m5", direction: "in", content: "Perfecto, nos vemos el martes entonces 👍", createdAt: new Date(Date.now() - 20 * 60000).toISOString() },
    ],
  },
  {
    id: "c3", contactName: "Laura Sánchez", contactEmail: null, contactPhone: "+34 611 222 333",
    channel: "sms", lastMessage: "Gracias por la info, lo pensaré.",
    lastAt: new Date(Date.now() - 3600000).toISOString(), unread: 1, assignedTo: null, tags: ["prospecto"], open: true,
    messages: [
      { id: "m6", direction: "out", content: "Hola Laura, somos Nelvyon. Te enviamos info sobre nuestro pack de marketing. ¿Te interesa?", createdAt: new Date(Date.now() - 7200000).toISOString(), status: "delivered" },
      { id: "m7", direction: "in", content: "Gracias por la info, lo pensaré.", createdAt: new Date(Date.now() - 3600000).toISOString() },
    ],
  },
  {
    id: "c4", contactName: "Pedro Ruiz", contactEmail: "pedro@startup.io", contactPhone: null,
    channel: "chat", lastMessage: "¿El plan Pro incluye acceso a la API?",
    lastAt: new Date(Date.now() - 2 * 3600000).toISOString(), unread: 3, assignedTo: null, tags: [], open: true,
    messages: [
      { id: "m8", direction: "in", content: "Hola, estoy explorando Nelvyon para mi startup.", createdAt: new Date(Date.now() - 3 * 3600000).toISOString() },
      { id: "m9", direction: "out", content: "¡Hola Pedro! Encantados. ¿En qué te puedo ayudar?", createdAt: new Date(Date.now() - 2.5 * 3600000).toISOString(), status: "read" },
      { id: "m10", direction: "in", content: "¿El plan Pro incluye acceso a la API?", createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    ],
  },
  {
    id: "c5", contactName: "Ana Torres", contactEmail: null, contactPhone: null,
    channel: "instagram", lastMessage: "Me encantó vuestro post sobre email marketing 🔥",
    lastAt: new Date(Date.now() - 5 * 3600000).toISOString(), unread: 1, assignedTo: null, tags: [], open: true,
    messages: [
      { id: "m11", direction: "in", content: "Me encantó vuestro post sobre email marketing 🔥", createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    ],
  },
];

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
  const [convs, setConvs] = useState<Conversation[]>(MOCK);
  const [selected, setSelected] = useState<Conversation>(MOCK[0]!);
  const [reply, setReply] = useState("");
  const [filterChannel, setFilterChannel] = useState<Channel | "all">("all");
  const [filterUnread, setFilterUnread] = useState(false);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [selected]);

  function sendReply() {
    if (!reply.trim()) return;
    const newMsg: Message = { id: Date.now().toString(), direction: "out", content: reply, createdAt: new Date().toISOString(), status: "sent" };
    setConvs(prev => prev.map(c => c.id === selected.id ? { ...c, messages: [...c.messages, newMsg], lastMessage: reply, lastAt: new Date().toISOString(), unread: 0 } : c));
    setSelected(s => ({ ...s, messages: [...s.messages, newMsg], lastMessage: reply }));
    setReply("");
  }

  function markRead(id: string) {
    setConvs(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
    if (selected.id === id) setSelected(s => ({ ...s, unread: 0 }));
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
              </div>
            </div>

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
                  {filtered.map(c => (
                    <button key={c.id} onClick={() => { setSelected(c); markRead(c.id); }}
                      className={`flex w-full items-start gap-3 border-b border-border p-3 text-left transition-colors ${selected.id === c.id ? "bg-primary/10" : "hover:bg-muted/10"}`}>
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

                {/* Reply box */}
                <div className="border-t border-border p-4">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 rounded-xl border border-border bg-background focus-within:border-primary">
                      <textarea
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
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
                    <NelvyonDsButton onClick={sendReply} disabled={!reply.trim()} className="h-10 px-5">↗ Enviar</NelvyonDsButton>
                  </div>
                </div>
              </div>

              {/* Right panel — contact info */}
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
                  <NelvyonDsButton variant="ghost" className="w-full text-xs">✓ Cerrar conversación</NelvyonDsButton>
                </div>
              </div>
            </div>
    </SaasShellLayout>
  );
}
