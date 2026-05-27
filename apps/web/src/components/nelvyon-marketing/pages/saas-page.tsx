"use client";

import { useState } from "react";

import { NelvyonMarketingShell } from "../marketing-shell";
import { NelvyonPricingCards } from "../pricing-cards";

const faqs = [
  {
    q: "¿Qué incluye NELVYON SaaS?",
    a: "CRM, email marketing, automatizaciones, funnels, analíticas, integraciones con Meta/Google/TikTok y agentes expertos de IA según tu plan.",
  },
  {
    q: "¿Hay período de prueba?",
    a: "Sí, 14 días gratis en todos los planes sin necesidad de tarjeta de crédito.",
  },
  {
    q: "¿Puedo migrar desde otra herramienta?",
    a: "Sí, ofrecemos importación de contactos, pipelines y plantillas de email desde las principales plataformas.",
  },
  {
    q: "¿Es white-label?",
    a: "El plan Elite incluye white-label completo con tu dominio, logo y colores.",
  },
  {
    q: "¿Cuántos usuarios puedo añadir?",
    a: "Starter hasta 3 usuarios, Growth hasta 15, Elite ilimitados.",
  },
  {
    q: "¿Dónde están los servidores?",
    a: "Infraestructura en la UE con cumplimiento GDPR y copias de seguridad diarias.",
  },
  {
    q: "¿Qué soporte incluye?",
    a: "Email en Starter, prioritario en Growth y manager dedicado en Elite con SLA garantizado.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí, sin permanencia. Cancelas desde el panel y mantienes acceso hasta fin de periodo facturado.",
  },
];

export function NelvyonSaasPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <NelvyonMarketingShell>
      <section
        className="px-4 py-20 text-center lg:px-6"
        style={{ background: "linear-gradient(175deg, #07122a 0%, #1a7fc4 70%, #4db8e8 100%)" }}
      >
        <h1 className="text-4xl font-bold text-white md:text-5xl">La plataforma SaaS para agencias de marketing</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
          Un panel. 25 herramientas. Agentes expertos. Escala sin contratar más personal.
        </p>
      </section>

      <section className="bg-white px-4 py-16 lg:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-[#07122a]">Todo incluido en la plataforma</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "CRM y pipeline unificado",
              "Email y secuencias automáticas",
              "Funnels y landing pages",
              "Pagos con Stripe",
              "Analíticas en tiempo real",
              "25+ integraciones nativas",
            ].map((item) => (
              <div key={item} className="rounded-xl border border-[#e8eef8] bg-[#f8faff] p-4 text-sm font-medium text-[#07122a]">
                ✓ {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f8faff] px-4 py-16 lg:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-[#07122a]">Precios</h2>
          <div className="mt-10">
            <NelvyonPricingCards />
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 lg:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-[#07122a]">Preguntas frecuentes</h2>
          <div className="mt-8 space-y-3">
            {faqs.map((faq, i) => (
              <div key={faq.q} className="rounded-xl border border-[#e8eef8] overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between bg-[#f8faff] px-5 py-4 text-left text-sm font-semibold text-[#07122a]"
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  {faq.q}
                  <span className="text-[#1a7fc4]">{open === i ? "−" : "+"}</span>
                </button>
                {open === i && <p className="border-t border-[#e8eef8] px-5 py-4 text-sm text-[#07122a]/75">{faq.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </NelvyonMarketingShell>
  );
}
