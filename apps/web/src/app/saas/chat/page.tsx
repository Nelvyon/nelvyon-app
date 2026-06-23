"use client";

import { useEffect, useRef, useState } from "react";

import { NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "¿Cómo creo una campaña de email para reactivar clientes inactivos?",
  "¿Qué agente IA me recomiendas para mejorar mis ventas B2B?",
  "Analiza qué debo mejorar en mi estrategia de SEO",
  "¿Cómo configuro un workflow para dar la bienvenida a nuevos contactos?",
  "¿Qué diferencia hay entre SMS y WhatsApp para marketing?",
  "Crea un plan de contenido para redes sociales este mes",
];

export default function SaasChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hola 👋 Soy tu asistente de marketing IA. Puedo ayudarte con CRM, campañas, SEO, publicidad, redes sociales, workflows, agentes IA y mucho más. ¿En qué empezamos?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/saas/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? data.error ?? "Error al responder." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "No pude conectar con el asistente. Inténtalo de nuevo." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="agentes" />}>
      <div className="flex h-[calc(100vh-80px)] flex-col gap-4">
        <NelvyonDsSectionHeader
          title="Asistente IA"
          subtitle="Tu experto en marketing digital disponible 24/7"
        />

        {/* Messages */}
        <NelvyonDsCard className="flex flex-1 flex-col overflow-hidden p-0">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${m.role === "assistant" ? "bg-primary/20 text-primary" : "bg-muted/50 text-foreground"}`}>
                  {m.role === "assistant" ? "N" : "Tú"[0]}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "assistant" ? "bg-muted/20 text-foreground" : "bg-primary text-primary-foreground"}`}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">N</div>
                <div className="rounded-2xl bg-muted/20 px-4 py-3">
                  <span className="inline-flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length === 1 && (
            <div className="border-t border-border px-5 py-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Sugerencias:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="rounded-full border border-border bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border px-4 py-3">
            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Pregunta cualquier cosa sobre marketing, SEO, publicidad, agentes IA… (Enter para enviar)"
                rows={2}
                className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <NelvyonDsButton onClick={() => void send()} disabled={!input.trim() || loading} className="shrink-0">
                {loading ? "…" : "Enviar"}
              </NelvyonDsButton>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Shift+Enter para nueva línea</p>
          </div>
        </NelvyonDsCard>
      </div>
    </SaasShellLayout>
  );
}
