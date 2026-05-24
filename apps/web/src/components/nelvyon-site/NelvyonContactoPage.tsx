"use client";

import { useState } from "react";

import { FadeUp } from "./FadeUp";
import { NelvyonShell } from "./NelvyonShell";

export function NelvyonContactoPage() {
  const [sent, setSent] = useState(false);

  return (
    <NelvyonShell>
      <section className="px-4 py-16 md:px-6 md:py-24">
        <FadeUp className="mx-auto max-w-2xl">
          <h1 className="text-4xl font-bold text-white md:text-5xl">Contacto</h1>
          <p className="mt-4 text-zinc-400">Cuéntanos tu proyecto. Respondemos en menos de 24 h laborables.</p>

          {sent ? (
            <div className="mt-10 rounded-2xl border border-[#0066FF]/30 bg-[#0066FF]/10 p-8 text-center">
              <p className="text-lg font-semibold text-white">Mensaje enviado</p>
              <p className="mt-2 text-sm text-zinc-400">Gracias. El equipo NELVYON te contactará pronto.</p>
            </div>
          ) : (
            <form
              className="mt-10 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <input
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none focus:border-[#0066FF]"
                placeholder="Nombre"
                required
                type="text"
              />
              <input
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none focus:border-[#0066FF]"
                placeholder="Email"
                required
                type="email"
              />
              <input
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none focus:border-[#0066FF]"
                placeholder="Empresa"
                type="text"
              />
              <textarea
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none focus:border-[#0066FF]"
                placeholder="¿En qué podemos ayudarte?"
                required
                rows={5}
              />
              <button
                className="w-full rounded-full bg-[#0066FF] py-3.5 text-sm font-semibold text-white hover:bg-[#0052cc]"
                type="submit"
              >
                Enviar mensaje
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-zinc-500">
            También puedes usar el chat en la esquina inferior derecha.
          </p>
        </FadeUp>
      </section>
    </NelvyonShell>
  );
}
