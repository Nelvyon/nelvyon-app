"use client";

import { useState } from "react";

import { FadeIn } from "./FadeIn";
import { LandingFooter } from "./LandingFooter";
import { MarketingNavbar } from "./MarketingNavbar";
import { BRAND } from "./shared";

export function ContactoPage() {
  const [sent, setSent] = useState(false);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: BRAND.bg, color: BRAND.textPrimary, fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      <MarketingNavbar active="/contacto" />
      <main className="mx-auto max-w-2xl px-4 py-16 md:px-6 md:py-24">
        <FadeIn>
          <h1 className="text-4xl font-extrabold text-white md:text-5xl">Contacto</h1>
          <p className="mt-4 text-[#94A3B8]">Cuéntanos tu proyecto. Respondemos en menos de 24 h laborables.</p>
        </FadeIn>
        {sent ? (
          <FadeIn>
            <div
              className="mt-10 rounded-2xl border p-8 text-center"
              style={{ borderColor: BRAND.borderLight, backgroundColor: "#F0F7FF" }}
            >
              <p className="text-lg font-semibold text-zinc-900">Mensaje enviado</p>
              <p className="mt-2 text-sm text-[#6B7280]">Gracias. El equipo NELVYON te contactará pronto.</p>
            </div>
          </FadeIn>
        ) : (
          <FadeIn delay={0.05}>
            <form
              className="mt-10 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <input
                className="w-full rounded-xl border border-[#1e293b] bg-[#0a0f1e] px-4 py-3 text-white outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20"
                placeholder="Nombre"
                required
                type="text"
              />
              <input
                className="w-full rounded-xl border border-[#1e293b] bg-[#0a0f1e] px-4 py-3 text-white outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20"
                placeholder="Email"
                required
                type="email"
              />
              <input
                className="w-full rounded-xl border border-[#1e293b] bg-[#0a0f1e] px-4 py-3 text-white outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20"
                placeholder="Empresa (opcional)"
                type="text"
              />
              <textarea
                className="min-h-[140px] w-full resize-none rounded-xl border border-[#1e293b] bg-[#0a0f1e] px-4 py-3 text-white outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20"
                placeholder="¿En qué podemos ayudarte?"
                required
              />
              <button
                className="nelvyon-cta-btn w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:scale-[1.02]"
                type="submit"
              >
                Enviar mensaje
              </button>
            </form>
          </FadeIn>
        )}
        <p className="mt-8 text-center text-sm text-[#94A3B8]">
          O escríbenos a <a href="mailto:hola@nelvyon.com" style={{ color: BRAND.blue }}>hola@nelvyon.com</a>
        </p>
      </main>
      <LandingFooter />
    </div>
  );
}
