"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Globe,
  Mail,
  Megaphone,
  MessageCircle,
  Mic,
  Search,
  Share2,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { NELVYON } from "./brand";
import { FadeUp } from "./FadeUp";
import { NelvyonShell } from "./NelvyonShell";

const ElectricHeroCanvas = dynamic(
  () => import("./ElectricHeroCanvas").then((m) => ({ default: m.ElectricHeroCanvas })),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 min-h-[480px] w-full bg-[radial-gradient(ellipse_at_center,rgba(0,102,255,0.15),transparent_70%)]"
      />
    ),
  },
);

const HOME_SERVICES = [
  { title: "SEO", icon: Search },
  { title: "Publicidad IA", icon: Megaphone },
  { title: "Social Media", icon: Share2 },
  { title: "Email", icon: Mail },
  { title: "CRM", icon: Users },
  { title: "Web Builder", icon: Globe },
  { title: "Voz IA", icon: Mic },
  { title: "Leads", icon: Target },
  { title: "Contenido IA", icon: Sparkles },
] as const;

const STEPS = [
  { n: "01", title: "Describes tu negocio", desc: "Sector, objetivos y tono en un briefing de 2 minutos." },
  { n: "02", title: "La IA trabaja sola", desc: "Agentes ejecutan campañas, contenido, web y social sin esperas." },
  { n: "03", title: "Ves resultados", desc: "Dashboard en vivo con leads, ROAS y conversiones reales." },
];

const RESULTS = [
  { value: "+340%", label: "leads" },
  { value: "+280%", label: "conversión" },
  { value: "24/7", label: "automatizado" },
];

const PLANS = [
  {
    name: "Starter",
    price: "€97",
    period: "/mes",
    features: ["3 agentes IA", "Web Builder básico", "Email + CRM", "Soporte email"],
  },
  {
    name: "Growth",
    price: "€297",
    period: "/mes",
    highlight: true,
    features: ["12 agentes", "Publicidad IA", "Social auto-publish", "Analytics avanzado"],
  },
  {
    name: "Elite",
    price: "€797",
    period: "/mes",
    features: ["Todo ilimitado", "Voz IA + leads", "Account manager", "SLA prioritario"],
  },
];

const FAQ = [
  {
    q: "¿Qué es NELVYON exactamente?",
    a: "Un sistema operativo de marketing con IA que ejecuta SEO, paid media, contenido, email, CRM, web y social desde un solo panel.",
  },
  {
    q: "¿Necesito conocimientos técnicos?",
    a: "No. Describes tu negocio en lenguaje natural y los agentes generan, publican y optimizan por ti.",
  },
  {
    q: "¿Puedo usar mi dominio y mis cuentas de ads?",
    a: "Sí. Conectas Google Ads, Meta, LinkedIn y publicamos en tu marca con tus credenciales.",
  },
  {
    q: "¿Cómo funciona el Web Builder con IA?",
    a: "Genera una web a medida (HTML/CSS/JS) desde tu briefing y la publica en un subdominio nelvyon.com.",
  },
  {
    q: "¿Hay periodo de prueba?",
    a: "Puedes empezar gratis y escalar a Starter, Growth o Elite cuando quieras activar más agentes.",
  },
];

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

export function NelvyonHomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <NelvyonShell>
      <section className="relative min-h-[72vh] overflow-hidden px-4 pb-24 pt-16 md:min-h-[80vh] md:px-6 md:pb-32 md:pt-28">
        <ElectricHeroCanvas />
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 mx-auto max-w-5xl text-center"
          initial={{ opacity: 0, y: 32 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.35em] text-[#0066FF]">Marketing autónomo</p>
          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-7xl">
            {NELVYON.slogan}
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-zinc-400 md:text-xl">{NELVYON.tagline}</p>
          <Link
            className="mt-12 inline-flex w-full max-w-xs items-center justify-center rounded-full bg-[#0066FF] px-10 py-4 text-base font-semibold text-white shadow-[0_0_48px_rgba(0,102,255,0.4)] transition hover:bg-[#0052cc] sm:w-auto"
            href="/register"
          >
            Empieza gratis
          </Link>
        </motion.div>
      </section>

      <section className="border-t border-white/10 px-4 py-20 md:px-6 md:py-28" id="servicios">
        <FadeUp className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">Servicios que ejecuta la IA por ti</h2>
          <p className="mt-4 text-zinc-500">Nueve disciplinas clave en un grid 3×3 — sin agencias ni esperas.</p>
        </FadeUp>
        <div className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HOME_SERVICES.map((s, i) => {
            const Icon = s.icon;
            return (
              <FadeUp delay={i * 0.04} key={s.title}>
                <GlassCard className="flex h-full flex-col items-center text-center transition hover:border-[#0066FF]/40">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#0066FF]/15 text-[#0066FF]">
                    <Icon className="h-7 w-7" aria-hidden />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{s.title}</h3>
                </GlassCard>
              </FadeUp>
            );
          })}
        </div>
      </section>

      <section className="border-t border-white/10 bg-black px-4 py-20 md:px-6 md:py-28">
        <FadeUp className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">Cómo funciona</h2>
        </FadeUp>
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <FadeUp delay={i * 0.08} key={step.n}>
              <GlassCard className="relative overflow-hidden">
                <span className="text-5xl font-black text-[#0066FF]/30">{step.n}</span>
                <h3 className="mt-4 text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm text-zinc-400">{step.desc}</p>
                <motion.div
                  aria-hidden
                  className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#0066FF]/10"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
                />
              </GlassCard>
            </FadeUp>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 px-4 py-20 md:px-6 md:py-28">
        <FadeUp className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">Resultados reales</h2>
        </FadeUp>
        <div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-3">
          {RESULTS.map((r, i) => (
            <FadeUp delay={i * 0.06} key={r.label}>
              <div className="text-center">
                <p className="text-5xl font-bold text-white md:text-6xl">
                  {r.value}
                  <span className="block text-base font-medium text-[#0066FF] md:inline md:ml-2 md:text-lg">
                    {r.label}
                  </span>
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 px-4 py-20 md:px-6 md:py-28" id="precios">
        <FadeUp className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">Precios transparentes</h2>
        </FadeUp>
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <FadeUp delay={i * 0.06} key={plan.name}>
              <GlassCard
                className={`flex h-full flex-col ${plan.highlight ? "border-[#0066FF]/50 ring-1 ring-[#0066FF]/30" : ""}`}
              >
                {plan.highlight ? (
                  <span className="mb-3 inline-block w-fit rounded-full bg-[#0066FF]/20 px-3 py-1 text-xs font-semibold text-[#66a3ff]">
                    Más popular
                  </span>
                ) : null}
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="mt-4 text-4xl font-bold text-white">
                  {plan.price}
                  <span className="text-base font-normal text-zinc-500">{plan.period}</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2 text-sm text-zinc-400">
                  {plan.features.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
                <Link
                  className={`mt-8 block rounded-full py-3 text-center text-sm font-semibold transition ${
                    plan.highlight
                      ? "bg-[#0066FF] text-white hover:bg-[#0052cc]"
                      : "border border-white/15 text-white hover:border-[#0066FF]/50"
                  }`}
                  href="/register"
                >
                  Elegir {plan.name}
                </Link>
              </GlassCard>
            </FadeUp>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 px-4 py-20 md:px-6 md:py-28">
        <FadeUp className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">Preguntas frecuentes</h2>
        </FadeUp>
        <div className="mx-auto mt-12 max-w-3xl space-y-3">
          {FAQ.map((item, i) => (
            <FadeUp delay={i * 0.04} key={item.q}>
              <GlassCard className="!p-0 overflow-hidden">
                <button
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  type="button"
                >
                  <span className="font-medium text-white">{item.q}</span>
                  <MessageCircle className="h-5 w-5 shrink-0 text-[#0066FF]" aria-hidden />
                </button>
                {openFaq === i ? <p className="border-t border-white/10 px-6 pb-4 text-sm text-zinc-400">{item.a}</p> : null}
              </GlassCard>
            </FadeUp>
          ))}
        </div>
      </section>

      <section className="px-4 pb-28 md:px-6">
        <FadeUp>
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[#0066FF]/30 bg-gradient-to-br from-[#0066FF]/20 via-black to-black px-8 py-16 text-center backdrop-blur-md md:px-16">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,102,255,0.25),transparent_60%)]" />
            <h2 className="relative text-3xl font-bold text-white md:text-4xl">
              Tu competencia ya usa IA. Tú también puedes.
            </h2>
            <Link
              className="relative mt-10 inline-flex rounded-full bg-[#0066FF] px-10 py-4 text-base font-semibold text-white transition hover:bg-[#0052cc]"
              href="/register"
            >
              Empieza gratis
            </Link>
          </div>
        </FadeUp>
      </section>
    </NelvyonShell>
  );
}
