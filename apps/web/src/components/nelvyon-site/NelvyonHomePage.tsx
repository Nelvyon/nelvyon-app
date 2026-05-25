"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

import { HOME_STATS, NELVYON, SERVICES } from "./brand";
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

const TESTIMONIALS = [
  {
    quote: "Pasamos de depender de tres agencias a un solo sistema que ejecuta y reporta cada semana.",
    name: "Laura M.",
    role: "CMO, SaaS B2B",
  },
  {
    quote: "La calidad del contenido y la velocidad de iteración no la habíamos visto ni con equipos de 12 personas.",
    name: "Carlos R.",
    role: "Founder, eCommerce",
  },
  {
    quote: "NELVYON no sustituye la estrategia: la acelera. Nosotros marcamos el rumbo, los agentes lo imponen.",
    name: "Elena V.",
    role: "Directora, Agencia boutique",
  },
];

const VS_AGENCY = [
  { label: "Tiempo de respuesta", nelvyon: "Minutos", agency: "Días / semanas" },
  { label: "Coste operativo", nelvyon: "Predecible", agency: "Variable + retainers" },
  { label: "Escalabilidad", nelvyon: "Ilimitada con IA", agency: "Limitada por headcount" },
  { label: "Transparencia", nelvyon: "Dashboard en vivo", agency: "Informes mensuales" },
];

export function NelvyonHomePage() {
  return (
    <NelvyonShell>
      <section className="relative min-h-[72vh] overflow-hidden px-4 pb-24 pt-16 md:min-h-[80vh] md:px-6 md:pb-32 md:pt-28">
        <ElectricHeroCanvas />
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 mx-auto max-w-5xl text-center"
          initial={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.35em] text-[#0066FF]">Marketing autónomo</p>
          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-7xl lg:text-[4.5rem]">
            {NELVYON.slogan}
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-zinc-400 md:text-xl">{NELVYON.tagline}</p>
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              className="w-full rounded-full bg-[#0066FF] px-10 py-4 text-base font-semibold text-white shadow-[0_0_48px_rgba(0,102,255,0.4)] transition hover:bg-[#0052cc] sm:w-auto"
              href="/register"
            >
              Crear mi imperio →
            </Link>
            <Link
              className="w-full rounded-full border border-white/15 bg-white/5 px-10 py-4 text-base font-medium text-zinc-200 backdrop-blur-sm transition hover:border-[#0066FF]/50 sm:w-auto"
              href="/servicios"
            >
              Explorar servicios
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="border-y border-white/[0.06] bg-[#080808] px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {HOME_STATS.map((stat, i) => (
            <FadeUp delay={i * 0.05} key={stat.label}>
              <div className="text-center">
                <p className="text-4xl font-bold text-white md:text-5xl">
                  {stat.value}
                  {stat.suffix ? <span className="text-[#0066FF]">{stat.suffix}</span> : null}
                </p>
                <p className="mt-2 text-sm font-medium uppercase tracking-wider text-zinc-500">{stat.label}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      <section className="border-b border-white/[0.06] px-4 py-20 md:px-6 md:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <FadeUp>
            <p className="text-sm font-semibold uppercase tracking-widest text-[#0066FF]">¿Qué es NELVYON?</p>
            <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">Tu marca, operada por un sistema autónomo</h2>
            <p className="mt-6 text-zinc-400 leading-relaxed">
              NELVYON conecta agentes de IA especializados en un solo ecosistema: posicionamiento, paid media, contenido,
              email, branding, social, CRM, automatización y más. Sin silos. Sin esperas. Con métricas que importan.
            </p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0066FF]/10 to-transparent p-1 shadow-[0_0_60px_rgba(0,102,255,0.15)]">
              <div className="rounded-[1.35rem] bg-[#0c0c0e]/90 p-8 backdrop-blur-xl">
                <motion.div
                  animate={{ scale: [1, 1.02, 1] }}
                  className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-[#0066FF]/20 text-4xl"
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  ✦
                </motion.div>
                <p className="mt-6 text-center text-sm font-medium text-white">Video explicativo — próximamente</p>
                <p className="mt-2 text-center text-xs text-zinc-500">
                  Avatar NELVYON guiándote por el sistema (estilo GHL premium)
                </p>
                <div className="mt-6 aspect-video rounded-xl border border-dashed border-white/15 bg-black/40" />
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <section className="px-4 py-20 md:px-6 md:py-28">
        <FadeUp className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">Servicios con precisión de boutique</h2>
          <p className="mt-4 text-zinc-500">Doce disciplinas. Un solo comando. Iconografía 3D y ejecución real.</p>
        </FadeUp>
        <div className="mx-auto mt-14 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => (
            <FadeUp delay={i * 0.04} key={s.slug}>
              <Link
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition hover:border-[#0066FF]/40 hover:bg-white/[0.04]"
                href={s.href}
              >
                <div
                  className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${s.gradient} text-2xl text-white shadow-lg transition group-hover:scale-110 group-hover:rotate-3`}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {s.icon}
                </div>
                <h3 className="text-xl font-semibold text-white">{s.title}</h3>
                <p className="mt-2 flex-1 text-sm text-zinc-500">{s.short}</p>
                <span className="mt-6 text-sm font-medium text-[#0066FF]">Ver detalle →</span>
              </Link>
            </FadeUp>
          ))}
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-[#080808] px-4 py-20 md:px-6 md:py-28">
        <FadeUp className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">NELVYON vs agencia tradicional</h2>
        </FadeUp>
        <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-3 bg-white/[0.03] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <span />
            <span className="text-center text-[#0066FF]">NELVYON</span>
            <span className="text-center">Agencia</span>
          </div>
          {VS_AGENCY.map((row) => (
            <div className="grid grid-cols-3 border-t border-white/[0.06] px-4 py-4 text-sm" key={row.label}>
              <span className="text-zinc-400">{row.label}</span>
              <span className="text-center font-medium text-white">{row.nelvyon}</span>
              <span className="text-center text-zinc-500">{row.agency}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-20 md:px-6 md:py-28">
        <FadeUp className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">Marcas que ya imponen su legado</h2>
        </FadeUp>
        <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <FadeUp delay={i * 0.08} key={t.name}>
              <blockquote className="flex h-full flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8">
                <p className="flex-1 text-zinc-300 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-6 border-t border-white/[0.06] pt-4">
                  <p className="font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-zinc-500">{t.role}</p>
                </footer>
              </blockquote>
            </FadeUp>
          ))}
        </div>
      </section>

      <section className="px-4 pb-28 md:px-6">
        <FadeUp>
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[#0066FF]/30 bg-gradient-to-br from-[#0066FF]/20 via-[#050505] to-[#050505] px-8 py-16 text-center md:px-16">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,102,255,0.25),transparent_60%)]" />
            <h2 className="relative text-3xl font-bold text-white md:text-5xl">Tu imperio empieza hoy</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-zinc-400">
              Únete a NELVYON y deja que el sistema trabaje mientras tú defines la visión.
            </p>
            <Link
              className="relative mt-10 inline-flex rounded-full bg-white px-10 py-4 text-base font-semibold text-[#050505] transition hover:bg-zinc-100"
              href="/register"
            >
              Empezar gratis
            </Link>
          </div>
        </FadeUp>
      </section>
    </NelvyonShell>
  );
}
