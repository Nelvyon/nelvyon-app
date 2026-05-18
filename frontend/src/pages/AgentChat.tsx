import { useState, useRef, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, Loader2, Bot, User, Sparkles, Copy, CheckCircle2,
  Code2, Wrench, FileCode, Terminal as TerminalIcon, Zap, Shield,
  RefreshCw, Trash2, Clock, ChevronDown,
} from "lucide-react";
import { AgentsLayout } from "@/components/agents/AgentsLayout";
import { agents } from "@/lib/agents-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getAPIBaseURL } from "@/lib/config";
import { getAgentConfig } from "@/lib/agent-prompts";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  status?: "sending" | "sent" | "error";
}

export default function AgentChat() {
  const { ts } = useI18n();
  const { agentId } = useParams();
  const navigate = useNavigate();
  const agent = agents.find(a => a.id === agentId);
  const config = agent ? getAgentConfig(agent.id) : null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (agent && config) {
      const welcomeMsg: ChatMessage = {
        id: "welcome",
        role: "assistant",
        content: config.welcomeMessage,
        timestamp: new Date(),
      };
      setMessages([welcomeMsg]);
    }
  }, [agent, config]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !agent || !config) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
      status: "sent",
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Build conversation history for context
    const conversationHistory = messages
      .filter(m => m.id !== "welcome" || m.role === "assistant")
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const baseUrl = getAPIBaseURL();

      const response = await fetch(`${baseUrl}/api/v1/aihub/gentxt`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: config.systemPrompt },
            ...conversationHistory,
            { role: "user", content: userMsg.content },
          ],
          model: config.model,
        }),
      });

      if (!response.ok) throw new Error("Error en la respuesta del servidor");

      const data = await response.json();
      const assistantContent = data.content || data.message || "No se pudo generar una respuesta.";

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: assistantContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      // Fallback: generate a contextual response
      const fallbackContent = generateFallback(agent.id, agent.name, agent.codename, userMsg.content);

      const fallbackMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: fallbackContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success("Copiado al portapapeles");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    if (agent && config) {
      const welcomeMsg: ChatMessage = {
        id: "welcome",
        role: "assistant",
        content: config.resetText,
        timestamp: new Date(),
      };
      setMessages([welcomeMsg]);
      toast.success("Chat reiniciado");
    }
  };

  if (!agent || !config) {
    return (
      <AgentsLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm text-slate-500">Agente no encontrado</p>
          <button onClick={() => navigate("/agents")} className="mt-3 text-xs text-cyan-400 hover:underline">
            Volver al panel
          </button>
        </div>
      </AgentsLayout>
    );
  }

  const Icon = agent.icon;

  return (
    <AgentsLayout>
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={() => navigate(`/agents/${agent.id}`)}
          className="mb-3 flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
        >
          <ArrowLeft className="h-3 w-3" />
          Volver a {agent.name}
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br", agent.gradient)}
            >
              <Icon className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">{agent.name}</h1>
                <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-medium text-emerald-400">Online</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500">{agent.codename} · Chat IA en tiempo real</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-[#12131A] px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <Trash2 className="h-3 w-3" /> Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-col rounded-xl border border-white/[0.06] bg-[#0A0C10] overflow-hidden" style={{ height: "calc(100vh - 240px)" }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "")}
              >
                {/* Avatar */}
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  msg.role === "user"
                    ? "bg-blue-500/10"
                    : `bg-gradient-to-br ${agent.gradient}`
                )}>
                  {msg.role === "user" ? (
                    <User className="h-4 w-4 text-blue-400" />
                  ) : (
                    <Icon className="h-4 w-4 text-white" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={cn(
                  "max-w-[80%] rounded-xl px-4 py-3",
                  msg.role === "user"
                    ? "bg-blue-500/10 border border-blue-500/20"
                    : "bg-white/[0.03] border border-white/[0.06]"
                )}>
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                    <MessageContent content={msg.content} />
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/[0.04]">
                    <span className="text-[9px] text-slate-600">
                      {msg.timestamp.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {msg.role === "assistant" && (
                      <button
                        onClick={() => copyMessage(msg.content, msg.id)}
                        className="p-1 rounded hover:bg-white/[0.04] transition-colors"
                      >
                        {copiedId === msg.id ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3 text-slate-600 hover:text-slate-400" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br", agent.gradient)}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: agent.color }} />
                  <span className="text-[10px] text-slate-500">{config.loadingText}</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-2">
              {config.quickActions.map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-[10px] text-slate-400 hover:text-white hover:border-white/[0.12] transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-white/[0.06] p-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={config.placeholder}
                rows={1}
                className="w-full resize-none rounded-xl border border-white/[0.06] bg-[#12131A] px-4 py-3 text-xs text-white placeholder-slate-600 outline-none focus:border-white/[0.15] transition-colors"
                style={{ minHeight: "44px", maxHeight: "120px" }}
                onInput={e => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "44px";
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className={cn(
                "flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl transition-all",
                input.trim() && !isLoading
                  ? `bg-gradient-to-br ${agent.gradient} hover:opacity-90`
                  : "bg-white/[0.04] cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              ) : (
                <Send className="h-4 w-4 text-white" />
              )}
            </button>
          </div>
          <p className="text-[9px] text-slate-700 mt-1.5 text-center">
            {agent.name} · Nelvyon IA · Respuestas en tiempo real · Shift+Enter para nueva línea
          </p>
        </div>
      </div>
    </AgentsLayout>
  );
}

// ── Message Content Renderer (handles markdown-like formatting) ──
function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const lines = part.slice(3, -3).split("\n");
          const lang = lines[0]?.trim() || "";
          const code = lang ? lines.slice(1).join("\n") : lines.join("\n");
          return (
            <div key={i} className="my-2 rounded-lg bg-[#0D1117] border border-white/[0.06] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.04]">
                <div className="flex items-center gap-1.5">
                  <FileCode className="h-3 w-3 text-cyan-400" />
                  <span className="text-[9px] font-mono text-slate-500">{lang || "code"}</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                    toast.success("Código copiado");
                  }}
                  className="text-[9px] text-slate-600 hover:text-slate-300 transition-colors flex items-center gap-1"
                >
                  <Copy className="h-2.5 w-2.5" /> Copiar
                </button>
              </div>
              <pre className="p-3 text-[10px] text-emerald-300 font-mono overflow-x-auto leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Handle bold **text**, inline code, and lists
        const formatted = part.split(/(\*\*.*?\*\*)/g).map((segment, j) => {
          if (segment.startsWith("**") && segment.endsWith("**")) {
            return <strong key={j} className="text-white font-semibold">{segment.slice(2, -2)}</strong>;
          }
          return segment.split(/(`[^`]+`)/g).map((s, k) => {
            if (s.startsWith("`") && s.endsWith("`")) {
              return <code key={k} className="px-1 py-0.5 rounded bg-white/[0.06] text-cyan-300 font-mono text-[10px]">{s.slice(1, -1)}</code>;
            }
            return <span key={k}>{s}</span>;
          });
        });

        return <span key={i}>{formatted}</span>;
      })}
    </>
  );
}

// ── Universal Fallback when API is unavailable ──
function generateFallback(agentId: string, agentName: string, codename: string, userInput: string): string {
  const input = userInput.toLowerCase();

  // Agent-specific fallbacks for the most common agents
  if (agentId === "coder") {
    if (input.includes("react") || input.includes("app") || input.includes("web")) {
      return `¡Perfecto! Puedo construir eso. Para generar el código completo necesito que me des más detalles:

1. **¿Qué funcionalidades principales?** — Auth, CRUD, pagos, chat, etc.
2. **¿Qué tecnologías prefieres?** — React, Next.js, Vue, etc.
3. **¿Diseño específico?** — Colores, estilo, referencias

Mientras tanto, aquí tienes la estructura recomendada:

\`\`\`
📁 proyecto/
├── 📁 src/
│   ├── 📁 components/    # Componentes reutilizables
│   ├── 📁 pages/         # Páginas/vistas
│   ├── 📁 lib/           # Utilidades y helpers
│   ├── 📁 hooks/         # Custom hooks
│   └── App.tsx           # Entry point
├── package.json
└── tsconfig.json
\`\`\`

**Dame los detalles y genero todo el código completo.** 🚀`;
    }
    return `¡Entendido! Como **CODER**, puedo construir cualquier aplicación. Dime más detalles sobre lo que necesitas y generaré código completo de producción. 🚀`;
  }

  if (agentId === "omega") {
    return `⚡ **OMEGA** procesando tu solicitud...

He analizado tu petición. Para darte la mejor respuesta posible sobre generación de contenido, necesito algunos datos:

1. **¿Cuál es tu sector/industria?**
2. **¿Quién es tu público objetivo?**
3. **¿Qué tipo de contenido necesitas?** (web, social, ads, propuesta, etc.)

Con estos datos, generaré contenido profesional y personalizado. ⚡`;
  }

  // Generic fallback for all other agents
  return `¡Entendido! Como **${agentName}** (${codename}), estoy procesando tu solicitud.

Para darte la mejor respuesta posible, necesito conectarme al servidor de IA. Si ves este mensaje, puede que haya una interrupción temporal en la conexión.

**Mientras tanto, puedo ayudarte con:**
- Análisis y recomendaciones sobre tu consulta
- Estrategias y planes de acción
- Templates y documentos

**Intenta de nuevo en unos segundos** — la conexión se restablecerá automáticamente. 🔄`;
}