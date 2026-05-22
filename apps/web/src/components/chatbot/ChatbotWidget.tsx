"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { streamAgentChat } from "@/lib/agentStream";
import type { ChatMessage } from "@/types/saas-client";

export type ChatbotWidgetProps = {
  chatbotId: string;
  primaryColor?: string;
  theme?: "dark" | "light";
  /** Base URL for API (e.g. https://app.example.com). Empty = same origin */
  apiBase?: string;
  greeting?: string;
  botName?: string;
};

type ChatApiResponse = {
  response: string;
  capturedLead?: { name?: string; email?: string };
  shouldEscalate?: boolean;
};

export default function ChatbotWidget({
  chatbotId,
  primaryColor = "#6366f1",
  theme = "dark",
  apiBase = "",
  greeting,
  botName = "Asistente",
}: ChatbotWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [escalate, setEscalate] = useState(false);
  const [leadDraft, setLeadDraft] = useState<{ name: string; email: string } | null>(null);
  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const k = "nelvyon_chatbot_sid";
    let s = sessionStorage.getItem(k);
    if (!s) {
      s = crypto.randomUUID();
      sessionStorage.setItem(k, s);
    }
    return s;
  }, []);

  const logRef = useRef<HTMLDivElement>(null);

  const palette =
    theme === "light"
      ? {
          panel: "bg-white text-slate-900 border-slate-200",
          log: "bg-slate-50",
          input: "bg-white border-slate-300 text-slate-900",
          bubbleUser: "bg-slate-200 text-slate-900",
          bubbleBot: "bg-slate-100 text-slate-800 border border-slate-200",
        }
      : {
          panel: "bg-slate-900 text-slate-100 border-slate-700",
          log: "bg-slate-950/80",
          input: "bg-slate-950 border-slate-600 text-slate-100",
          bubbleUser: "bg-indigo-600 text-white",
          bubbleBot: "bg-slate-800 text-slate-200 border border-slate-600",
        };

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [history, open]);

  const postMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !sessionId) return;
      const userMsg: ChatMessage = { role: "user", content: text.trim() };
      setHistory((h) => [...h, userMsg]);
      setLoading(true);

      const assistantIndex = history.length + 1;
      setHistory((h) => [...h, { role: "assistant", content: "" }]);

      const messages = [
        {
          role: "system",
          content: `Eres ${botName}, asistente del chatbot ${chatbotId}. Responde en español, breve y útil.`,
        },
        ...history.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
        { role: "user", content: text.trim() },
      ];

      try {
        let streamed = "";
        await streamAgentChat({
          serviceId: chatbotId,
          clientContext: { sessionId, apiBase: apiBase || "same-origin" },
          messages,
          onChunk: (delta) => {
            streamed += delta;
            setHistory((h) => {
              const next = [...h];
              if (next[assistantIndex]) {
                next[assistantIndex] = { role: "assistant", content: streamed };
              }
              return next;
            });
          },
        });
      } catch {
        const base = apiBase.replace(/\/$/, "");
        const url = `${base}/api/saas/chatbot/chat`;
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatbotId,
              sessionId,
              message: text.trim(),
              history,
            }),
          });
          if (!res.ok) throw new Error("chat_failed");
          const data = (await res.json()) as ChatApiResponse;
          setHistory((h) => {
            const next = [...h];
            next[assistantIndex] = { role: "assistant", content: data.response };
            return next;
          });
          if (data.shouldEscalate) setEscalate(true);
          if (data.capturedLead?.email || data.capturedLead?.name) {
            setLeadDraft({
              name: data.capturedLead.name ?? "",
              email: data.capturedLead.email ?? "",
            });
          }
        } catch {
          setHistory((h) => {
            const next = [...h];
            next[assistantIndex] = {
              role: "assistant",
              content: "No se pudo conectar. Inténtalo de nuevo.",
            };
            return next;
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [apiBase, botName, chatbotId, history, sessionId],
  );

  function send(): void {
    const t = input;
    setInput("");
    void postMessage(t);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Abrir chat"
        className="fixed bottom-5 right-5 z-[99999] rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
        style={{ backgroundColor: primaryColor, boxShadow: "0 4px 24px rgba(0,0,0,.25)" }}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "×" : botName}
      </button>

      {open && (
        <div
          className={`fixed bottom-24 right-5 z-[99998] flex h-[min(480px,70vh)] w-[min(380px,92vw)] flex-col overflow-hidden rounded-xl border shadow-2xl ${palette.panel}`}
        >
          <div className="border-b border-slate-600/30 px-3 py-2 text-sm font-medium">
            {botName}
            {greeting && <p className="mt-0.5 text-xs font-normal opacity-80">{greeting}</p>}
          </div>

          {escalate && (
            <div className="bg-amber-500/15 px-3 py-2 text-center text-xs text-amber-200">
              Escalando a humano… Un agente revisará tu conversación.
            </div>
          )}

          <div ref={logRef} className={`flex-1 space-y-2 overflow-y-auto p-3 text-sm ${palette.log}`}>
            {history.length === 0 && greeting && (
              <p className="rounded-lg border border-slate-600/40 p-2 text-xs opacity-90">{greeting}</p>
            )}
            {history.map((m, i) => (
              <div
                key={i}
                className={`max-w-[92%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? `ml-auto ${palette.bubbleUser}` : palette.bubbleBot}`}
              >
                {m.content}
              </div>
            ))}
            {loading && <p className="text-xs opacity-60">Escribiendo…</p>}
          </div>

          {leadDraft && (
            <div className="border-t border-slate-600/30 p-3 text-xs">
              <p className="mb-2 font-medium">Datos de contacto</p>
              <input
                className={`mb-2 w-full rounded border px-2 py-1 ${palette.input}`}
                placeholder="Nombre"
                value={leadDraft.name}
                onChange={(e) => setLeadDraft((l) => (l ? { ...l, name: e.target.value } : l))}
              />
              <input
                className={`mb-2 w-full rounded border px-2 py-1 ${palette.input}`}
                placeholder="Email"
                value={leadDraft.email}
                onChange={(e) => setLeadDraft((l) => (l ? { ...l, email: e.target.value } : l))}
              />
              <button
                type="button"
                className="w-full rounded-lg py-2 text-xs font-medium text-white"
                style={{ backgroundColor: primaryColor }}
                onClick={() => {
                  const line = `Confirmo mis datos: ${leadDraft.name || "(sin nombre)"} ${leadDraft.email || ""}`.trim();
                  setLeadDraft(null);
                  void postMessage(line);
                }}
              >
                Enviar datos al asistente
              </button>
            </div>
          )}

          <div className="flex gap-2 border-t border-slate-600/30 p-2">
            <input
              className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm ${palette.input}`}
              placeholder="Escribe un mensaje…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            />
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
              disabled={loading}
              onClick={send}
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
