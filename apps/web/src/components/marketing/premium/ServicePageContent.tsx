"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { CTA_REGISTER, type ServicePageConfig } from "./constants";
import { FadeIn } from "./FadeIn";
import { MarketingShell } from "./MarketingShell";

export function ServicePageContent({ service }: { service: ServicePageConfig }) {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden px-4 pb-16 pt-12 md:px-6 md:pb-24 md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-4xl text-center"
        >
          <p
            className={`mb-6 inline-block rounded-full border border-white/10 bg-gradient-to-r ${service.gradient} bg-clip-text px-4 py-1 text-sm font-medium text-transparent`}
          >
            Servicio NELVYON
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            {service.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 md:text-xl">{service.subtitle}</p>
          <Link
            href={CTA_REGISTER}
            className={`mt-10 inline-flex rounded-full bg-gradient-to-r ${service.gradient} px-8 py-4 text-base font-semibold text-white shadow-xl shadow-indigo-500/20 transition hover:brightness-110`}
          >
            Empieza gratis →
          </Link>
        </motion.div>
      </section>

      <section className="border-y border-white/[0.06] bg-white/[0.02] px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-4xl">
          <FadeIn>
            <h2 className="text-2xl font-bold text-white md:text-3xl">Qué hace NELVYON por ti</h2>
            <p className="mt-3 text-zinc-500">Agentes especializados ejecutan cada tarea con supervisión y métricas claras.</p>
          </FadeIn>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {service.features.map((item, i) => (
              <FadeIn key={item} delay={i * 0.06}>
                <li className="flex gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs text-indigo-300">
                    ✓
                  </span>
                  <span className="text-sm leading-relaxed text-zinc-300">{item}</span>
                </li>
              </FadeIn>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-4xl">
          <FadeIn>
            <h2 className="text-center text-2xl font-bold text-white md:text-3xl">Cómo funciona</h2>
          </FadeIn>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {service.steps.map((step, i) => (
              <FadeIn key={step.title} delay={i * 0.1}>
                <div className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/10 text-lg font-bold text-indigo-300">
                    {i + 1}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm text-zinc-500">{step.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.06] bg-white/[0.02] px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <h2 className="text-2xl font-bold text-white md:text-3xl">Resultados esperados</h2>
            <ul className="mt-8 space-y-4 text-left">
              {service.results.map((r) => (
                <li key={r} className="flex items-start gap-3 text-zinc-300">
                  <span className="text-indigo-400">→</span>
                  {r}
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </section>

      <section className="px-4 py-16 md:px-6 md:py-24">
        <FadeIn>
          <div
            className={`mx-auto max-w-3xl rounded-3xl border border-white/10 bg-gradient-to-br ${service.gradient} p-[1px]`}
          >
            <div className="rounded-3xl bg-[#0a0a0a]/90 px-6 py-10 text-center md:px-12 md:py-14">
              <p className="text-sm uppercase tracking-wider text-zinc-500">Incluido en plan</p>
              <p className="mt-2 text-3xl font-bold text-white">{service.planName}</p>
              <p className="mt-1 text-4xl font-bold text-white md:text-5xl">
                {service.planPrice}€
                <span className="text-lg font-normal text-zinc-500">/mes</span>
              </p>
              <Link
                href="/pricing"
                className="mt-4 inline-block text-sm text-indigo-400 underline-offset-4 hover:underline"
              >
                Ver todos los planes
              </Link>
              <div className="mt-8">
                <Link
                  href={CTA_REGISTER}
                  className="inline-flex rounded-full bg-white px-8 py-4 text-base font-semibold text-[#0a0a0a] transition hover:bg-zinc-200"
                >
                  Empieza gratis →
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </MarketingShell>
  );
}
