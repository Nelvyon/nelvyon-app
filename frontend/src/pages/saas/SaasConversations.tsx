import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare, Loader2, Search, Send, Bot, Eye, Globe,
  Phone, Instagram, Facebook, CheckCircle2, Clock,
  RefreshCw, Trash2, ArrowDown,
} from "lucide-react";
import { api, client, getApiErrorMessage, type Conversation as ConvType, type ConversationMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const channelIcons: Record<string, React.ElementType> = {
  whatsapp: Phone, email: Send, instagram: Instagram, facebook: Facebook,
  web: Globe, sms: MessageSquare, bot: Bot,
};

const channelColors: Record<string, string> = {
  whatsapp: "from-green-500/20 to-emerald-500/20",
  email: "from-blue-500/20 to-cyan-500/20",
  instagram: "from-pink-500/20 to-rose-500/20",
  facebook: "from-blue-600/20 to-indigo-500/20",
  web: "from-violet-500/20 to-purple-500/20",
  sms: "from-amber-500/20 to-yellow-500/20",
  bot: "from-cyan-500/20 to-teal-500/20",
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Activo", color: "bg-emerald-500", bg: "bg-emerald-500/10 text-emerald-400" },
  waiting: { label: "Esperando", color: "bg-amber-500", bg: "bg-amber-500/10 text-amber-400" },
  resolved: { label: "Resuelto", color: "bg-blue-500", bg: "bg-blue-500/10 text-blue-400" },
  bot: { label: "Bot", color: "bg-violet-500", bg: "bg-violet-500/10 text-violet-400" },
};

export default function SaasConversations() {
  const { ts } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState<ConvType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedConv, setSelectedConv] = useState<ConvType | null>(null);
  const [filter, setFilter] = useState<string>("all");

  /* ── Messages state ── */
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const preselectHandledRef = useRef<string | null>(null);
  const preselectContactId = useMemo(() => {
    const raw = new URLSearchParams(location.search).get("contact_id");
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [location.search]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  /* ── Fetch conversations ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await client.entities.conversations.query({ sort: "-last_message_at", limit: 100 });
      const items = (res.data?.items as ConvType[]) || [];
      setConversations(items);
    } catch {
      setLoadError("No se pudieron cargar las conversaciones.");
      toast.error("Error cargando conversaciones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setSelectedConv(null);
    setMessages([]);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    void fetchData();
  }, [user, activeWorkspace?.id, fetchData]);

  /* ── Fetch messages when conversation selected ── */
  const fetchMessages = useCallback(async (convId: number) => {
    setMessagesLoading(true);
    try {
      const res = await api.getConversationMessages(convId, 0, 100);
      const ordered = [...(res.items || [])].sort((a, b) => {
        const ta = new Date(a.created_at || 0).getTime();
        const tb = new Date(b.created_at || 0).getTime();
        return ta - tb;
      });
      setMessages(ordered);
    } catch (err) {
      setMessages([]);
      toast.error(getApiErrorMessage(err, "No se pudieron cargar los mensajes."));
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  /* ── SSE real-time stream ── */
  const connectSSE = useCallback(async (convId: number) => {
    // Disconnect previous
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const { stream_token } = await api.createConversationStreamToken(convId);
      const url = api.getConversationStreamUrl(convId, stream_token);
      const es = new EventSource(url);

      es.addEventListener("new_message", (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data) as ConversationMessage;
          setMessages(prev => {
            if (prev.some(m => m.id === message.id)) return prev;
            return [...prev, message].sort((a, b) => {
              const ta = new Date(a.created_at || 0).getTime();
              const tb = new Date(b.created_at || 0).getTime();
              return ta - tb;
            });
          });
        } catch { /* ignore parse errors */ }
      });

      es.onerror = () => {
        // Silently reconnect after 3s
        es.close();
        setTimeout(() => {
          if (eventSourceRef.current === es) {
            void connectSSE(convId);
          }
        }, 3000);
      };

      eventSourceRef.current = es;
    } catch { /* SSE not available, fallback to polling */ }
  }, []);

  /* ── Select conversation ── */
  const handleSelectConv = useCallback((conv: ConvType) => {
    setSelectedConv(conv);
    setMessages([]);
    fetchMessages(conv.id);
    void connectSSE(conv.id);

    // Mark as read
    api.markConversationRead(conv.id).catch(() => {});
  }, [fetchMessages, connectSSE]);

  useEffect(() => {
    if (!preselectContactId || conversations.length === 0) return;
    const preselectKey = `${activeWorkspace?.id ?? "none"}:${preselectContactId}`;
    if (preselectHandledRef.current === preselectKey) return;
    const matched = conversations.find(c => c.contact_id === preselectContactId);
    if (!matched) {
      toast.info("Este contacto aún no tiene conversación en Inbox.");
      preselectHandledRef.current = preselectKey;
      return;
    }
    preselectHandledRef.current = preselectKey;
    if (selectedConv?.id !== matched.id) {
      handleSelectConv(matched);
    }
  }, [preselectContactId, conversations, selectedConv?.id, handleSelectConv, activeWorkspace?.id]);

  /* ── Cleanup SSE on unmount ── */
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  /* ── Auto-scroll to bottom ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Send message ── */
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConv || sending) return;
    const content = messageInput.trim();
    setMessageInput("");
    setSending(true);

    // Optimistic update
    const optimistic: ConversationMessage = {
      id: Date.now(),
      conversation_id: selectedConv.id,
      sender_type: "agent",
      sender_name: user?.name || user?.email?.split("@")[0] || "Agente",
      content,
      channel: selectedConv.channel,
      status: "sending",
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const result = await api.sendConversationMessage(
        selectedConv.id,
        content,
        "agent",
        user?.name || user?.email?.split("@")[0] || "Agente",
      );
      // Replace optimistic with real
      setMessages(prev => {
        const withoutOptimistic = prev.filter(m => m.id !== optimistic.id);
        if (withoutOptimistic.some(m => m.id === result.id)) return withoutOptimistic;
        return [...withoutOptimistic, { ...result, status: "sent" }].sort((a, b) => {
          const ta = new Date(a.created_at || 0).getTime();
          const tb = new Date(b.created_at || 0).getTime();
          return ta - tb;
        });
      });
      // Refresh conversation list to update last_message
      fetchData();
    } catch {
      setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...m, status: "failed" } : m));
      toast.error("Error enviando mensaje");
    } finally {
      setSending(false);
    }
  };

  /* ── Delete conversation ── */
  const handleDelete = async (id: number) => {
    try {
      await client.entities.conversations.delete({ id: String(id) });
      toast.success("Conversación eliminada");
      if (selectedConv?.id === id) {
        setSelectedConv(null);
        setMessages([]);
        if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; }
      }
      await fetchData();
    } catch {
      toast.error("Error eliminando conversación");
    }
  };

  /* ── Resolve conversation ── */
  const handleResolve = async (conv: ConvType) => {
    try {
      await client.entities.conversations.update({ id: String(conv.id), data: { status: "resolved", unread_count: 0 } });
      toast.success("Conversación resuelta");
      await fetchData();
    } catch {
      toast.error("Error resolviendo conversación");
    }
  };

  /* ── Derived ── */
  const filtered = conversations.filter(c => {
    const matchSearch = (c.contact_name || "").toLowerCase().includes(search.toLowerCase()) || (c.last_message || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.status === filter || c.channel === filter;
    return matchSearch && matchFilter;
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  const activeCount = conversations.filter(c => c.status === "active").length;

  /* ── Format time ── */
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "ahora";
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    return d.toLocaleDateString("es", { day: "numeric", month: "short" });
  };

  return (
    <SaasLayout title="Conversaciones" subtitle="Mensajería en tiempo real — SSE + PostgreSQL">
      {/* Status bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] text-emerald-400 font-medium">TIEMPO REAL — SSE Stream · Mensajes persistentes</span>
        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-[9px] font-bold text-blue-400 border border-blue-500/20 ml-2">ENVÍO REAL</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total", value: conversations.length, icon: MessageSquare, color: "text-blue-400", bg: "from-blue-500/10 to-cyan-500/10" },
          { label: "Sin Leer", value: totalUnread, icon: Eye, color: "text-amber-400", bg: "from-amber-500/10 to-yellow-500/10" },
          { label: "Activas", value: activeCount, icon: Clock, color: "text-emerald-400", bg: "from-emerald-500/10 to-green-500/10" },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl bg-[#0F1419] border border-white/[0.04] hover:border-white/[0.08] transition-all">
            <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2", s.bg)}>
              <s.icon className={cn("w-4 h-4", s.color)} />
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-zinc-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input placeholder="Buscar conversaciones..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-[#0F1419] border-white/[0.06] text-white text-sm h-9" />
        </div>
        {["all", "active", "waiting", "resolved"].map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}
            className={cn("text-[10px] h-8", filter === f ? "bg-blue-600 text-white" : "border-white/10 text-zinc-500")}>
            {f === "all" ? "Todos" : statusConfig[f]?.label || f}
          </Button>
        ))}
        <Button size="sm" onClick={fetchData} variant="outline" className="border-white/10 text-zinc-400 h-8"><RefreshCw className="w-3 h-3" /></Button>
      </div>

      {/* Main area */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
      ) : loadError ? (
        <div className="text-center py-20 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
          <MessageSquare className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-red-300 mb-2">{loadError}</p>
          <Button size="sm" onClick={fetchData} variant="outline" className="border-white/10 text-zinc-300">
            Reintentar
          </Button>
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-20 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
          <MessageSquare className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 mb-2">No hay conversaciones</p>
          <p className="text-xs text-zinc-600">Las conversaciones aparecerán aquí cuando se creen desde contactos o formularios.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 rounded-xl overflow-hidden border border-white/[0.04]" style={{ minHeight: 520 }}>
          {/* ── Conversation List ── */}
          <div className="lg:col-span-4 bg-[#0A0E13] border-r border-white/[0.04]">
            <div className="p-3 border-b border-white/[0.04] flex items-center justify-between">
              <span className="text-[10px] font-semibold text-zinc-400">{filtered.length} conversaciones</span>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 470 }}>
              {filtered.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-[10px] text-zinc-600">Sin resultados</p>
                </div>
              ) : filtered.map(conv => {
                const ChIcon = channelIcons[conv.channel] || MessageSquare;
                const sc = statusConfig[conv.status || "active"] || statusConfig.active;
                return (
                  <div key={conv.id} onClick={() => handleSelectConv(conv)}
                    className={cn(
                      "flex items-start gap-3 px-3 py-3 cursor-pointer border-b border-white/[0.02] transition-all duration-200",
                      selectedConv?.id === conv.id ? "bg-blue-500/[0.08] border-l-2 border-l-blue-500" : "hover:bg-white/[0.02] border-l-2 border-l-transparent"
                    )}>
                    <div className="relative shrink-0">
                      <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white/80", channelColors[conv.channel] || "from-zinc-500/20 to-zinc-600/20")}>
                        {(conv.contact_name || "??").substring(0, 2).toUpperCase()}
                      </div>
                      <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0A0E13]", sc.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-white truncate">{conv.contact_name}</span>
                        <div className="flex items-center gap-1">
                          {conv.last_message_at && <span className="text-[9px] text-zinc-600">{formatTime(conv.last_message_at)}</span>}
                          {(conv.unread_count || 0) > 0 && <span className="w-5 h-5 rounded-full bg-blue-600 text-[9px] font-bold text-white flex items-center justify-center shrink-0">{conv.unread_count}</span>}
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">{conv.last_message || "Sin mensajes"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <ChIcon className="w-3 h-3 text-zinc-600" />
                        <span className="text-[9px] text-zinc-700">{conv.channel}</span>
                        <span className={cn("px-1 py-0 rounded text-[8px]", sc.bg)}>{sc.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Chat Panel ── */}
          <div className="lg:col-span-8 bg-[#080B10] flex flex-col">
            {selectedConv ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] bg-[#0A0E13]">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white/80", channelColors[selectedConv.channel])}>
                      {(selectedConv.contact_name || "??").substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{selectedConv.contact_name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500">{selectedConv.channel}</span>
                        {selectedConv.subject && <span className="text-[10px] text-zinc-600">· {selectedConv.subject}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="text-[10px] h-7 border-emerald-500/20 text-emerald-400" onClick={() => handleResolve(selectedConv)}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Resolver
                    </Button>
                    <Button size="sm" variant="outline" className="text-[10px] h-7 border-red-500/20 text-red-400" onClick={() => handleDelete(selectedConv.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Messages area */}
                <div className="flex-1 p-4 overflow-y-auto" style={{ minHeight: 320, maxHeight: 420 }}>
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      <span className="ml-2 text-xs text-zinc-500">Cargando mensajes...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <MessageSquare className="w-8 h-8 text-zinc-700 mb-2" />
                      <p className="text-xs text-zinc-500">No hay mensajes aún</p>
                      <p className="text-[10px] text-zinc-600 mt-1">Envía el primer mensaje para iniciar la conversación</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map(msg => {
                        const isAgent = msg.sender_type === "agent" || msg.sender_type === "system";
                        return (
                          <div key={msg.id} className={cn("flex", isAgent ? "justify-end" : "justify-start")}>
                            <div className={cn("max-w-[75%] rounded-2xl px-4 py-2.5 relative",
                              isAgent
                                ? "bg-blue-600/20 border border-blue-500/20 rounded-br-md"
                                : "bg-white/[0.04] border border-white/[0.06] rounded-bl-md"
                            )}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={cn("text-[10px] font-semibold", isAgent ? "text-blue-400" : "text-zinc-400")}>
                                  {msg.sender_name || (isAgent ? "Agente" : "Contacto")}
                                </span>
                                <span className="text-[9px] text-zinc-600">{formatTime(msg.created_at)}</span>
                              </div>
                              <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                              {msg.status === "sending" && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Loader2 className="w-2.5 h-2.5 text-zinc-500 animate-spin" />
                                  <span className="text-[9px] text-zinc-600">Enviando...</span>
                                </div>
                              )}
                              {msg.status === "failed" && (
                                <span className="text-[9px] text-red-400 mt-1 block">Error al enviar</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="px-4 py-3 border-t border-white/[0.04] bg-[#0A0E13]">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Escribe un mensaje..."
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                      className="flex-1 bg-[#0F1419] border-white/[0.06] text-white text-sm h-10"
                      disabled={sending}
                    />
                    <Button size="sm" onClick={handleSendMessage} disabled={!messageInput.trim() || sending}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-4">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">Selecciona una conversación</p>
                  <p className="text-xs text-zinc-600 mt-1">para ver el historial y enviar mensajes en tiempo real</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </SaasLayout>
  );
}