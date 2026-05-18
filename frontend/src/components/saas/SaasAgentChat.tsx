import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  X, Send, Sparkles, Crown, Globe,
  MessageCircle, ArrowRight, RotateCcw, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  findAgentByPath, fallbackAgent, detectLanguage, getLanguageName,
  type SectionAgent,
} from "@/lib/saas-section-agents";
import { client } from "@/lib/api";

/* ─── Chat message type ─── */
interface ChatMessage {
  id: string;
  role: "agent" | "user";
  text: string;
  timestamp: Date;
}

/* ─── Build system prompt for the AI agent ─── */
function buildSystemPrompt(agent: SectionAgent, lang: string): string {
  const langNames: Record<string, string> = {
    es: "español", en: "English", pt: "português", fr: "français",
    de: "Deutsch", it: "italiano", zh: "中文", ja: "日本語",
    ko: "한국어", ar: "العربية", hi: "हिन्दी", ru: "русский", tr: "Türkçe",
  };
  const langName = langNames[lang] || "español";

  return `Eres ${agent.name}, un asistente experto de NELVYON OS especializado en "${agent.role}".

REGLAS ESTRICTAS:
1. Responde SIEMPRE en ${langName}.
2. Sé conciso pero útil. Máximo 200 palabras por respuesta.
3. Usa formato markdown ligero: **negritas** para énfasis, listas numeradas para pasos.
4. Eres profesional pero cercano. Usa emojis con moderación (1-2 por respuesta).
5. Si te preguntan algo fuera de tu área, redirige amablemente al módulo correcto de NELVYON.
6. NUNCA inventes datos específicos (números de ventas, métricas exactas). Di "puedes verlo en el dashboard" o similar.
7. Tus capacidades son: ${agent.capabilities.join(", ")}.
8. Si el usuario saluda, preséntate brevemente y ofrece ayuda con tus capacidades.
9. NO repitas la misma estructura en cada respuesta. Varía tu formato.
10. Si no sabes algo, sé honesto y sugiere dónde encontrar la información.`;
}

/* ─── Call real AI via SDK client.ai.gentxt ─── */
async function callAIAgent(
  agent: SectionAgent,
  userMessage: string,
  chatHistory: ChatMessage[],
  lang: string,
): Promise<string> {
  const systemPrompt = buildSystemPrompt(agent, lang);

  // Build conversation history (last 10 messages for context window)
  const recentHistory = chatHistory.slice(-10);
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...recentHistory.map(m => ({
      role: (m.role === "agent" ? "assistant" : "user") as "user" | "assistant",
      content: m.text,
    })),
    { role: "user", content: userMessage },
  ];

  try {
    const res = await client.ai.gentxt({
      messages,
      model: "deepseek-v3.2",
      stream: false,
      timeout: 30000,
    });

    const content = res?.data?.content;
    if (content) return content;
    throw new Error("Empty response");
  } catch (err) {
    console.error("[SaasAgentChat] AI call failed:", err);
    // Graceful fallback - use local knowledge base
    return getLocalFallback(agent, userMessage, lang);
  }
}

/* ─── Local fallback when AI is unavailable ─── */
function getLocalFallback(agent: SectionAgent, userMessage: string, lang: string): string {
  const lowerMsg = userMessage.toLowerCase();

  // Check knowledge base
  for (const kb of agent.knowledgeBase) {
    const keywords = kb.q.toLowerCase().split(" ").filter(w => w.length > 3);
    const matchCount = keywords.filter(kw => lowerMsg.includes(kw)).length;
    if (matchCount >= 2 || lowerMsg.includes(kb.q.toLowerCase().slice(0, 20))) {
      return kb.a;
    }
  }

  const fallbacks: Record<string, string> = {
    es: `Soy ${agent.name}. Puedo ayudarte con: ${agent.capabilities.slice(0, 3).join(", ")}. ¿Qué necesitas? 🚀`,
    en: `I'm ${agent.name}. I can help with: ${agent.capabilities.slice(0, 3).join(", ")}. What do you need? 🚀`,
    pt: `Sou ${agent.name}. Posso ajudar com: ${agent.capabilities.slice(0, 3).join(", ")}. O que precisa? 🚀`,
    fr: `Je suis ${agent.name}. Je peux aider avec: ${agent.capabilities.slice(0, 3).join(", ")}. De quoi avez-vous besoin? 🚀`,
    de: `Ich bin ${agent.name}. Ich kann helfen mit: ${agent.capabilities.slice(0, 3).join(", ")}. Was brauchen Sie? 🚀`,
  };
  return fallbacks[lang] || fallbacks.es || fallbacks.en!;
}

/* ─── Simple markdown-like renderer ─── */
function renderText(text: string) {
  return text.split("\n").map((line, i) => {
    const processed = line
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/^\d+\.\s/, (m) => `<span class="text-violet-400 font-bold">${m}</span>`);
    if (line.trim() === "") return <br key={i} />;
    return (
      <span key={i} className="block" dangerouslySetInnerHTML={{ __html: processed }} />
    );
  });
}

/* ─── Main Component ─── */
export default function SaasAgentChat() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [lang, setLang] = useState("es");
  const [hasGreeted, setHasGreeted] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevPathRef = useRef(location.pathname);

  // Detect language
  useEffect(() => {
    setLang(detectLanguage());
  }, []);

  // Get current agent
  const currentAgent = findAgentByPath(location.pathname) || fallbackAgent;

  // Reset chat when navigating to a new section
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      setMessages([]);
      setHasGreeted(false);
      prevPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  // Auto-greet when opening
  useEffect(() => {
    if (isOpen && !hasGreeted) {
      const greetingText = currentAgent.greeting[lang] || currentAgent.greeting.es || currentAgent.greeting.en!;
      setMessages([{
        id: "greeting",
        role: "agent",
        text: greetingText,
        timestamp: new Date(),
      }]);
      setHasGreeted(true);
    }
  }, [isOpen, hasGreeted, currentAgent, lang]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when open
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Pulse animation for the FAB
  useEffect(() => {
    if (!isOpen) {
      const interval = setInterval(() => setPulseCount(p => p + 1), 8000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // Call real AI backend
      const response = await callAIAgent(currentAgent, text.trim(), messages, lang);
      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        role: "agent",
        text: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMsg]);
    } catch {
      // Should not reach here since callAIAgent has its own fallback
      const errorMsg: ChatMessage = {
        id: `agent-err-${Date.now()}`,
        role: "agent",
        text: lang === "en"
          ? "Sorry, I had a temporary issue. Please try again."
          : "Disculpa, tuve un problema temporal. Intenta de nuevo.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [currentAgent, lang, messages, isTyping]);

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  const resetChat = () => {
    setMessages([]);
    setHasGreeted(false);
    setTimeout(() => {
      const greetingText = currentAgent.greeting[lang] || currentAgent.greeting.es || currentAgent.greeting.en!;
      setMessages([{
        id: "greeting-reset",
        role: "agent",
        text: greetingText,
        timestamp: new Date(),
      }]);
      setHasGreeted(true);
    }, 300);
  };

  // Don't show on non-saas pages
  if (!location.pathname.startsWith("/saas")) return null;

  const AgentIcon = currentAgent.icon;

  return (
    <>
      {/* ─── Floating Action Button ─── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-500 hover:scale-110 group",
            "bg-gradient-to-br",
            currentAgent.gradient,
          )}
          style={{ boxShadow: `0 8px 32px ${currentAgent.color}40` }}
        >
          <AgentIcon className="w-6 h-6 text-white" />
          {/* Pulse ring */}
          <div
            key={pulseCount}
            className="absolute inset-0 rounded-2xl border-2 animate-ping opacity-30"
            style={{ borderColor: currentAgent.color }}
          />
          {/* Badge */}
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
            <Crown className="w-3 h-3 text-white" />
          </div>
          {/* Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap px-3 py-1.5 rounded-lg bg-[#111] border border-white/10 text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
            <span className="text-amber-300 font-bold">{currentAgent.name}</span> — {currentAgent.role}
          </div>
        </button>
      )}

      {/* ─── Chat Window ─── */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] rounded-2xl bg-[#0A0E13] border border-white/[0.08] shadow-2xl flex flex-col overflow-hidden"
          style={{ height: "min(650px, calc(100vh - 6rem))", boxShadow: `0 16px 64px ${currentAgent.color}20` }}>

          {/* Header */}
          <div className={cn("px-4 py-3 bg-gradient-to-r shrink-0", currentAgent.gradient)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-sm">
                  {currentAgent.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">{currentAgent.name}</span>
                    <Crown className="w-3 h-3 text-amber-300" />
                    <span className="px-1.5 py-0 rounded text-[7px] font-black bg-white/20 text-white">IA REAL</span>
                  </div>
                  <p className="text-[10px] text-white/70">{currentAgent.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={resetChat} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Reiniciar chat">
                  <RotateCcw className="w-3.5 h-3.5 text-white/70" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>
            </div>

            {/* Info bar */}
            <div className="flex items-center gap-1 mt-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold bg-white/20 text-white">
                <MessageCircle className="w-3 h-3" />
                Chat IA
              </div>
              <div className="ml-auto flex items-center gap-1">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 text-[8px] text-white/80">
                  <Globe className="w-2.5 h-2.5" />
                  {getLanguageName(lang)}
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 text-[8px] text-white/80">
                  <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                  DeepSeek
                </div>
              </div>
            </div>
          </div>

          {/* ─── Chat ─── */}
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
              {messages.map(msg => (
                <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "agent" && (
                    <div className={cn("w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0 mt-0.5", currentAgent.gradient)}>
                      <span className="text-[10px] font-bold text-white">{currentAgent.avatar}</span>
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[80%] rounded-xl px-3 py-2 text-[11px] leading-relaxed",
                    msg.role === "user"
                      ? "bg-violet-600/20 border border-violet-500/20 text-white"
                      : "bg-white/[0.04] border border-white/[0.06] text-slate-300"
                  )}>
                    {renderText(msg.text)}
                    <span className="block text-[8px] text-zinc-600 mt-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-2">
                  <div className={cn("w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0", currentAgent.gradient)}>
                    <span className="text-[10px] font-bold text-white">{currentAgent.avatar}</span>
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 text-violet-400 animate-spin" />
                    <span className="text-[10px] text-zinc-500">
                      {lang === "en" ? "Thinking..." : "Pensando..."}
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length <= 1 && (
              <div className="px-4 py-2 border-t border-white/[0.04] shrink-0">
                <p className="text-[9px] text-zinc-600 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  {lang === "en" ? "Quick actions" : lang === "pt" ? "Ações rápidas" : lang === "fr" ? "Actions rapides" : lang === "de" ? "Schnellaktionen" : "Acciones rápidas"}
                </p>
                <div className="space-y-1">
                  {currentAgent.quickActions.map(qa => (
                    <button
                      key={qa.label}
                      onClick={() => handleQuickAction(qa.prompt)}
                      disabled={isTyping}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] hover:border-violet-500/20 text-left transition-all group disabled:opacity-50"
                    >
                      <ArrowRight className="w-3 h-3 text-violet-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      <span className="text-[10px] text-slate-400 group-hover:text-white transition-colors">{qa.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-white/[0.04] shrink-0">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                  disabled={isTyping}
                  placeholder={
                    lang === "en" ? `Ask ${currentAgent.name} anything...` :
                    lang === "pt" ? `Pergunte ao ${currentAgent.name}...` :
                    lang === "fr" ? `Demandez à ${currentAgent.name}...` :
                    lang === "de" ? `Fragen Sie ${currentAgent.name}...` :
                    `Pregunta a ${currentAgent.name}...`
                  }
                  className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-500/20 disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isTyping}
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                    input.trim() && !isTyping
                      ? "bg-gradient-to-br " + currentAgent.gradient + " text-white shadow-lg hover:scale-105"
                      : "bg-white/[0.04] text-zinc-700"
                  )}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-[8px] text-zinc-700 flex items-center gap-1">
                  <Sparkles className="w-2 h-2 text-violet-400" /> IA REAL
                </span>
                <span className="text-[8px] text-zinc-700">·</span>
                <span className="text-[8px] text-zinc-700 flex items-center gap-1">
                  <Globe className="w-2 h-2" /> 30+ idiomas
                </span>
                <span className="text-[8px] text-zinc-700">·</span>
                <span className="text-[8px] text-zinc-700">DeepSeek v3.2</span>
              </div>
            </div>
          </>
        </div>
      )}
    </>
  );
}