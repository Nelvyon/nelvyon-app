"use client";

import { useCallback, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import type { ChatStage } from "@/lib/nelvyon-site-chat";

type Msg = { role: "user" | "bot"; text: string };

export function NelvyonChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<ChatStage>("detect_sector");
  const [sectorId, setSectorId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "bot",
      text: "Hola — soy el asistente de NELVYON. Cuéntame qué tipo de negocio tienes (restaurante, clínica, ecommerce…) y te digo resultados reales para tu sector.",
    },
  ]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setBusy(true);
      setMessages((m) => [...m, { role: "user", text: trimmed }]);
      setInput("");

      const history = messages
        .filter((m) => m.role === "user" || m.role === "bot")
        .map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("assistant" as const),
          content: m.text,
        }));

      try {
        const res = await fetch("/api/nelvyon-site/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, history, stage, sectorId }),
        });
        const data = (await res.json()) as { reply?: string; stage?: ChatStage; sectorId?: string };
        if (data.sectorId) setSectorId(data.sectorId);
        if (data.stage) setStage(data.stage);
        const reply =
          data.reply ||
          "NELVYON ejecuta marketing con IA 24/7. **Empieza tu prueba gratuita de 14 días →** https://nelvyon.com/register";
        setMessages((m) => [...m, { role: "bot", text: reply }]);
      } catch {
        setMessages((m) => [
          ...m,
          {
            role: "bot",
            text: "NELVYON ayuda a negocios como el tuyo a conseguir más clientes con IA. **Empieza tu prueba gratuita de 14 días →** https://nelvyon.com/register",
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, messages, stage, sectorId],
  );

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="fixed bottom-24 right-4 z-[60] flex h-[min(520px,70vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0e]/95 shadow-2xl shadow-[#0066FF]/20 backdrop-blur-xl"
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">Asistente NELVYON</p>
                <p className="text-xs text-zinc-500">Ventas · resultados por sector</p>
              </div>
              <button aria-label="Cerrar" className="text-zinc-400 hover:text-white" onClick={() => setOpen(false)} type="button">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user" ? "ml-auto bg-[#0066FF] text-white" : "bg-white/5 text-zinc-200"
                  }`}
                >
                  {m.text.split(/(https:\/\/[^\s]+)/g).map((part, j) =>
                    part.startsWith("https://") ? (
                      <a className="underline text-[#7eb6ff]" href={part} key={j}>
                        {part.includes("/register") ? "Empieza tu prueba gratuita →" : part}
                      </a>
                    ) : (
                      <span key={j}>{part}</span>
                    ),
                  )}
                </div>
              ))}
            </div>
            <form
              className="flex gap-2 border-t border-white/10 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <input
                className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#0066FF]"
                disabled={busy}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ej: tengo una clínica dental en Madrid…"
                value={input}
              />
              <button
                aria-label="Enviar"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0066FF] text-white disabled:opacity-50"
                disabled={busy}
                type="submit"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        aria-label="Abrir chat"
        className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#0066FF] text-white shadow-[0_0_40px_rgba(0,102,255,0.45)] transition hover:scale-105"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </>
  );
}
