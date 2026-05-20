"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import { FadeIn } from "./FadeIn";
import { MarketingShell } from "./MarketingShell";

export function ContactPageContent() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");
    const message = String(data.get("message") ?? "");
    const subject = encodeURIComponent(`Contacto NELVYON — ${name}`);
    const body = encodeURIComponent(`Nombre: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:hola@nelvyon.com?subject=${subject}&body=${body}`;
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 400);
  }

  return (
    <MarketingShell>
      <section className="px-4 py-12 md:px-6 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-xl text-center"
        >
          <h1 className="text-4xl font-bold text-white md:text-5xl">Contacto</h1>
          <p className="mt-4 text-zinc-400">Cuéntanos tu proyecto. Respondemos en menos de 24 horas laborables.</p>
        </motion.div>

        <FadeIn className="mx-auto mt-12 max-w-lg">
          {sent ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
              <p className="text-lg font-medium text-emerald-300">Gracias — tu cliente de correo se ha abierto.</p>
              <p className="mt-2 text-sm text-zinc-500">Si no se abrió, escribe a hola@nelvyon.com</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 md:p-8"
            >
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-zinc-400">
                  Nombre
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white outline-none ring-indigo-500/0 transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-400">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-zinc-400">
                  Mensaje
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-blue-600 py-4 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "Enviando…" : "Enviar mensaje →"}
              </button>
            </form>
          )}
        </FadeIn>
      </section>
    </MarketingShell>
  );
}
