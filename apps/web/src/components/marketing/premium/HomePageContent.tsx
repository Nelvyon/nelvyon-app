"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { CTA_REGISTER, HOME_SERVICES } from "./constants";
import { FadeIn } from "./FadeIn";
import { MarketingShell } from "./MarketingShell";

export function HomePageContent() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden px-4 pb-20 pt-12 md:px-6 md:pb-32 md:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-5xl text-center"
        >
          <p className="mb-6 text-sm font-medium uppercase tracking-[0.2em] text-indigo-400/90">
            Marketing autónomo con IA
          </p>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[5.25rem]">
            Tu equipo de marketing.
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
              Sin contratar a nadie.
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-zinc-400 md:text-xl">
            SEO, publicidad, contenido, email y branding — ejecutados por agentes IA especializados. Un solo sistema,
            resultados reales.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={CTA_REGISTER}
              className="w-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-blue-600 px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-indigo-500/30 transition hover:brightness-110 sm:w-auto"
            >
              Empieza gratis →
            </Link>
            <Link
              href="/pricing"
              className="w-full rounded-full border border-white/15 px-8 py-4 text-base font-medium text-zinc-200 transition hover:border-white/30 hover:bg-white/5 sm:w-auto"
            >
              Ver precios
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="border-y border-white/[0.06] px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <h2 className="text-center text-3xl font-bold text-white md:text-4xl">Cada servicio, su propia página</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-zinc-500">
              Explora en detalle cómo NELVYON ejecuta cada disciplina de marketing.
            </p>
          </FadeIn>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {HOME_SERVICES.map((s, i) => (
              <FadeIn key={s.href} delay={i * 0.08}>
                <Link
                  href={s.href}
                  className="group flex h-full flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition hover:border-indigo-500/40 hover:bg-white/[0.06]"
                >
                  <div
                    className={`mb-4 h-1 w-12 rounded-full bg-gradient-to-r ${s.gradient}`}
                  />
                  <h3 className="text-xl font-semibold text-white group-hover:text-indigo-200">{s.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-500">{s.description}</p>
                  <span className="mt-6 text-sm font-medium text-indigo-400 group-hover:text-indigo-300">
                    Ver página completa →
                  </span>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:px-6 md:py-24">
        <FadeIn>
          <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/20 via-indigo-500/10 to-blue-600/20 p-10 text-center md:p-14">
            <h2 className="text-2xl font-bold text-white md:text-3xl">Listo para escalar sin fricción</h2>
            <p className="mt-4 text-zinc-400">
              Planes desde 95€/mes. Sin permanencia. Empieza en minutos.
            </p>
            <Link
              href={CTA_REGISTER}
              className="mt-8 inline-flex rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-4 font-semibold text-white"
            >
              Empieza gratis →
            </Link>
          </div>
        </FadeIn>
      </section>
    </MarketingShell>
  );
}
