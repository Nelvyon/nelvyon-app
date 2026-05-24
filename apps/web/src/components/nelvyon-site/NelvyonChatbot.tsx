"use client";

import { useCallback, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FAQ: { q: RegExp; a: string }[] = [
  {
    q: /qu[eé] es|nelvyon/i,
    a: "NELVYON es un sistema autónomo de marketing con IA: SEO, publicidad, contenido, email, branding y social media ejecutados por agentes especializados.",
  },
  {
    q: /precio|plan|coste|cu[aá]nto/i,
    a: "Ofrecemos tres planes escalables. Consulta /precios para comparar funcionalidades y solicitar tu propuesta personalizada.",
  },
  {
    q: /demo|prueba|registr/i,
    a: "Puedes crear tu cuenta en /register y acceder al panel en minutos. El equipo también puede guiarte en una demo personalizada.",
  },
  {
    q: /agencia|diferencia|vs/i,
    a: "A diferencia de una agencia tradicional, NELVYON opera 24/7 con agentes IA, sin cuellos de botella humanos y con métricas en tiempo real.",
  },
  {
    q: /contact|hablar|soporte/i,
    a: "Escríbenos en /contacto o deja tu email aquí y te responderemos en menos de 24 horas laborables.",
  },
];

function answer(text: string): string {
  const hit = FAQ.find((f) => f.q.test(text));
  return (
    hit?.a ??
    "Gracias por tu interés en NELVYON. Para una respuesta detallada visita /contacto o explora /servicios para ver cada módulo."
  );
}

export function NelvyonChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([
    { role: "bot", text: "Hola, soy el asistente de NELVYON. ¿En qué puedo ayudarte?" },
  ]);
  const busy = false;

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    window.setTimeout(() => {
      setMessages((m) => [...m, { role: "bot", text: answer(trimmed) }]);
    }, 400);
  }, []);

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
                <p className="text-xs text-zinc-500">Respuestas instantáneas</p>
              </div>
              <button aria-label="Cerrar" className="text-zinc-400 hover:text-white" onClick={() => setOpen(false)} type="button">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user" ? "ml-auto bg-[#0066FF] text-white" : "bg-white/5 text-zinc-200"
                  }`}
                >
                  {m.text}
                </div>
              ))}
            </div>
            <form
              className="flex gap-2 border-t border-white/10 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <input
                className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#0066FF]"
                disabled={busy}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregunta sobre NELVYON…"
                value={input}
              />
              <button
                aria-label="Enviar"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0066FF] text-white"
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
