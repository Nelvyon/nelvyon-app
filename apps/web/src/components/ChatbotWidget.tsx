"use client";

import { MessageCircle, Send, X } from "lucide-react";
import { useState } from "react";

import { BRAND } from "@/components/landing/shared";

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <>
      <button
        aria-label="Abrir chat de ayuda"
        className="nelvyon-glow-btn fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-105"
        onClick={() => setOpen(true)}
        style={{ backgroundColor: BRAND.blue }}
        type="button"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[101] flex items-end justify-end p-4 sm:items-center sm:justify-center">
          <button
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div className="nelvyon-chat-panel relative w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl">
            <button
              aria-label="Cerrar panel"
              className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:text-white"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="pr-8 text-lg font-bold text-white">¿En qué podemos ayudarte?</h3>
            <p className="mt-2 text-sm" style={{ color: BRAND.textMuted }}>
              Escribe tu consulta y te responderemos lo antes posible.
            </p>
            {sent ? (
              <p className="mt-6 text-sm font-medium" style={{ color: BRAND.cyan }}>
                Mensaje recibido. Gracias por contactar.
              </p>
            ) : (
              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!message.trim()) return;
                  setSent(true);
                }}
              >
                <textarea
                  className="min-h-[120px] w-full resize-none rounded-xl border bg-black/30 px-4 py-3 text-sm text-white outline-none focus:ring-2"
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Cuéntanos qué necesitas..."
                  style={{ borderColor: BRAND.cardBorder }}
                  value={message}
                />
                <button
                  className="nelvyon-glow-btn flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition hover:scale-[1.02]"
                  style={{ backgroundColor: BRAND.blue }}
                  type="submit"
                >
                  <Send className="h-4 w-4" />
                  Enviar
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
