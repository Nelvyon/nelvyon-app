"use client";

import {
  Bot,
  Mail,
  MessageCircle,
  MessageSquare,
  Mic,
  Phone,
  Search,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";
import {
  CHANNEL_COLORS,
  CHANNEL_LABELS,
  omnichannelApi,
  type ContactContext,
  type OmnichannelChannel,
  type OmnichannelConversation,
  type OmnichannelMessage,
  type OmnichannelStatus,
} from "@/features/omnichannel/api";

const CHANNEL_ICONS: Record<OmnichannelChannel, typeof Mail> = {
  email: Mail,
  whatsapp: Phone,
  sms: MessageSquare,
  chat: MessageCircle,
  voice: Mic,
};

function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function avatarLabel(conv: OmnichannelConversation) {
  return (conv.participant_name || conv.participant_email || conv.participant_phone || "?")
    .charAt(0)
    .toUpperCase();
}

export default function OmnichannelInboxPage() {
  const [conversations, setConversations] = useState<OmnichannelConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<OmnichannelMessage[]>([]);
  const [context, setContext] = useState<ContactContext | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [autoReply, setAutoReply] = useState(false);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const loadInbox = useCallback(async () => {
    setLoading(true);
    try {
      const res = await omnichannelApi.inbox({
        channel: channelFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setConversations(res.items ?? []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [channelFilter, statusFilter, search]);

  useEffect(() => {
    loadInbox().catch(() => undefined);
    const t = setInterval(() => loadInbox().catch(() => undefined), 15000);
    return () => clearInterval(t);
  }, [loadInbox]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setContext(null);
      setAutoReply(false);
      return;
    }
    omnichannelApi
      .messages(selectedId)
      .then((r) => {
        setMessages(r.items ?? []);
        loadInbox();
      })
      .catch(() => setMessages([]));
    omnichannelApi.context(selectedId).then(setContext).catch(() => setContext(null));
  }, [selectedId, loadInbox]);

  useEffect(() => {
    setAutoReply(Boolean(selected?.auto_reply_enabled));
  }, [selected]);

  async function sendReply() {
    if (!selectedId || !reply.trim()) return;
    await omnichannelApi.reply(selectedId, reply.trim());
    setReply("");
    const r = await omnichannelApi.messages(selectedId);
    setMessages(r.items ?? []);
    loadInbox();
  }

  async function suggestReply() {
    if (!selectedId) return;
    setSuggesting(true);
    try {
      const r = await omnichannelApi.suggest(selectedId);
      setReply(r.suggestion ?? "");
    } finally {
      setSuggesting(false);
    }
  }

  async function toggleAutoReply() {
    if (!selectedId) return;
    const next = !autoReply;
    await omnichannelApi.toggleAutoReply(selectedId, next);
    setAutoReply(next);
    loadInbox();
  }

  async function changeStatus(status: OmnichannelStatus) {
    if (!selectedId) return;
    await omnichannelApi.updateStatus(selectedId, status);
    loadInbox();
  }

  return (
    <ProtectedLayout module="inbox">
      <div className="flex h-[calc(100vh-4rem)] flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-3">
          <h1 className="text-lg font-bold">Inbox omnicanal</h1>
          <SearchField search={search} setSearch={setSearch} />
          <select
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
          >
            <option value="">Todos los canales</option>
            {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="open">Abiertas</option>
            <option value="pending">Pendientes</option>
            <option value="resolved">Resueltas</option>
          </select>
        </header>

        <InboxGrid
          autoReply={autoReply}
          changeStatus={changeStatus}
          conversations={conversations}
          context={context}
          loading={loading}
          messages={messages}
          reply={reply}
          selected={selected}
          selectedId={selectedId}
          sendReply={sendReply}
          setReply={setReply}
          setSelectedId={setSelectedId}
          suggestReply={suggestReply}
          suggesting={suggesting}
          toggleAutoReply={toggleAutoReply}
        />
      </div>
    </ProtectedLayout>
  );
}

function SearchField({ search, setSearch }: { search: string; setSearch: (v: string) => void }) {
  return (
    <div className="relative min-w-[180px] max-w-sm flex-1">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <input
        className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm"
        placeholder="Buscar conversaciones…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  );
}

function InboxGrid(props: {
  loading: boolean;
  conversations: OmnichannelConversation[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  selected: OmnichannelConversation | null;
  messages: OmnichannelMessage[];
  context: ContactContext | null;
  reply: string;
  setReply: (v: string) => void;
  sendReply: () => void;
  suggestReply: () => void;
  suggesting: boolean;
  autoReply: boolean;
  toggleAutoReply: () => void;
  changeStatus: (s: OmnichannelStatus) => void;
}) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_1fr_280px]">
      <ConversationList
        conversations={props.conversations}
        loading={props.loading}
        selectedId={props.selectedId}
        onSelect={props.setSelectedId}
      />
      <MessageThread
        autoReply={props.autoReply}
        messages={props.messages}
        reply={props.reply}
        selected={props.selected}
        sendReply={props.sendReply}
        setReply={props.setReply}
        suggestReply={props.suggestReply}
        suggesting={props.suggesting}
        toggleAutoReply={props.toggleAutoReply}
      />
      <ContactPanel context={props.context} onStatusChange={props.changeStatus} selected={props.selected} />
    </div>
  );
}

function ConversationList({
  conversations,
  loading,
  selectedId,
  onSelect,
}: {
  conversations: OmnichannelConversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (loading && conversations.length === 0) {
    return <aside className="border-r p-4 text-sm text-muted-foreground">Cargando…</aside>;
  }
  return (
    <aside className="overflow-y-auto border-r bg-muted/20">
      {conversations.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">Sin conversaciones</p>
      ) : (
        conversations.map((c) => {
          const Icon = CHANNEL_ICONS[c.channel] ?? Mail;
          return (
            <button
              key={c.id}
              type="button"
              className={cn(
                "flex w-full gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted/50",
                selectedId === c.id && "bg-muted",
              )}
              onClick={() => onSelect(c.id)}
            >
              <ConvAvatar channel={c.channel} icon={Icon} label={avatarLabel(c)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-sm font-medium">
                    {c.participant_name || c.participant_email || c.participant_phone || "Contacto"}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{formatTime(c.last_message_at)}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-xs text-muted-foreground">{c.last_message || "—"}</p>
                  {c.unread_count > 0 ? (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      {c.unread_count}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })
      )}
    </aside>
  );
}

function ConvAvatar({
  label,
  channel,
  icon: Icon,
}: {
  label: string;
  channel: OmnichannelChannel;
  icon: typeof Mail;
}) {
  return (
    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
      {label}
      <span
        className={cn(
          "absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-white",
          CHANNEL_COLORS[channel],
        )}
      >
        <Icon className="h-2.5 w-2.5" />
      </span>
    </div>
  );
}

function MessageThread({
  selected,
  messages,
  reply,
  setReply,
  sendReply,
  suggestReply,
  suggesting,
  autoReply,
  toggleAutoReply,
}: {
  selected: OmnichannelConversation | null;
  messages: OmnichannelMessage[];
  reply: string;
  setReply: (v: string) => void;
  sendReply: () => void;
  suggestReply: () => void;
  suggesting: boolean;
  autoReply: boolean;
  toggleAutoReply: () => void;
}) {
  if (!selected) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Selecciona una conversación
      </main>
    );
  }
  return (
    <main className="flex min-w-0 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div>
          <p className="font-semibold">{selected.participant_name || selected.participant_email || "Conversación"}</p>
          <p className="text-xs text-muted-foreground">
            {CHANNEL_LABELS[selected.channel]} · {selected.status}
          </p>
        </div>
        <Button size="sm" variant={autoReply ? "default" : "outline"} onClick={toggleAutoReply}>
          <Bot className="mr-1 h-4 w-4" />
          Auto-reply {autoReply ? "activado" : "off"}
        </Button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>
      <ReplyComposer
        reply={reply}
        sendReply={sendReply}
        setReply={setReply}
        suggestReply={suggestReply}
        suggesting={suggesting}
      />
    </main>
  );
}

function MessageBubble({ message: m }: { message: OmnichannelMessage }) {
  return (
    <div
      className={cn(
        "max-w-[80%] rounded-xl px-3 py-2 text-sm",
        m.direction === "out" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted",
      )}
    >
      <p>{m.content}</p>
      <p className="mt-1 text-[10px] opacity-70">{formatTime(m.created_at)}</p>
    </div>
  );
}

function ReplyComposer({
  reply,
  setReply,
  sendReply,
  suggestReply,
  suggesting,
}: {
  reply: string;
  setReply: (v: string) => void;
  sendReply: () => void;
  suggestReply: () => void;
  suggesting: boolean;
}) {
  return (
    <div className="border-t p-3">
      <SuggestRow suggestReply={suggestReply} suggesting={suggesting} />
      <div className="flex gap-2">
        <textarea
          className="min-h-[72px] flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
          placeholder="Escribe tu respuesta…"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <Button className="self-end" onClick={sendReply}>
          Enviar
        </Button>
      </div>
    </div>
  );
}

function SuggestRow({ suggestReply, suggesting }: { suggestReply: () => void; suggesting: boolean }) {
  return (
    <div className="mb-2 flex gap-2">
      <Button disabled={suggesting} size="sm" variant="outline" onClick={suggestReply}>
        <Sparkles className="mr-1 h-4 w-4" />
        {suggesting ? "Generando…" : "Sugerir respuesta IA"}
      </Button>
    </div>
  );
}

function ContactPanel({
  selected,
  context,
  onStatusChange,
}: {
  selected: OmnichannelConversation | null;
  context: ContactContext | null;
  onStatusChange: (s: OmnichannelStatus) => void;
}) {
  if (!selected) {
    return <aside className="hidden border-l bg-card lg:block" />;
  }
  const contact = context?.contact;
  return (
    <aside className="hidden overflow-y-auto border-l bg-card p-4 lg:block">
      <h3 className="mb-3 text-sm font-semibold">Contacto</h3>
      {contact ? (
        <div className="space-y-2 text-sm">
          <p className="font-medium">{String(contact.name ?? "—")}</p>
          <p className="text-muted-foreground">{String(contact.email ?? selected.participant_email ?? "—")}</p>
          <p className="text-muted-foreground">{String(contact.phone ?? selected.participant_phone ?? "—")}</p>
          {context?.score != null ? (
            <p className="rounded-md bg-muted px-2 py-1 text-xs">Lead score: {context.score}</p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sin datos CRM vinculados</p>
      )}
      <h3 className="mb-2 mt-6 text-sm font-semibold">Acciones rápidas</h3>
      <div className="flex flex-col gap-1">
        <Button size="sm" variant="outline" onClick={() => onStatusChange("open")}>
          Marcar abierta
        </Button>
        <Button size="sm" variant="outline" onClick={() => onStatusChange("pending")}>
          Pendiente
        </Button>
        <Button size="sm" variant="outline" onClick={() => onStatusChange("resolved")}>
          Resolver
        </Button>
      </div>
    </aside>
  );
}
