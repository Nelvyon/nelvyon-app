"use client";

import Image from "next/image";
import { motion } from "framer-motion";

import { FadeIn } from "../FadeIn";
import { LandingFooter } from "../LandingFooter";
import { MarketingNavbar } from "../MarketingNavbar";
import { BRAND } from "../shared";
import { SectionHeading } from "../ui";

const VALUES = [
  { title: "Transparencia", desc: "Precios claros, informes honestos y sin letra pequeña en contratos." },
  { title: "Resultados", desc: "Nos pagas por impacto en tu negocio, no por horas de reunión." },
  { title: "Innovación", desc: "Tecnología IA aplicada donde aporta ROI real, no por moda." },
  { title: "Cercanía", desc: "Hablas con personas que conocen tu cuenta, no con un ticket anónimo." },
] as const;

const TECH = ["OpenAI", "Google Cloud", "Meta API", "Stripe", "Twilio", "Vercel", "PostgreSQL", "Redis"] as const;

const TIMELINE = [
  { year: "2026", title: "Expansión EU", desc: "Presencia en 5 países europeos con soporte local." },
  { year: "2028", title: "IA predictiva", desc: "Modelos propios de atribución y forecasting de ventas." },
  { year: "2030", title: "Líder Iberoamérica", desc: "Referente en marketing automatizado para PYMEs." },
] as const;

const STATS = [
  { v: "10.000+", l: "Clientes" },
  { v: "25+", l: "Servicios" },
  { v: "8", l: "Años" },
  { v: "12", l: "Países" },
] as const;

export function NosotrosPage() {
  return (
    <div style={{ backgroundColor: BRAND.bg, color: BRAND.textMuted, fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <MarketingNavbar active="/nosotros" />
      <main>
        <section className="py-20 md:py-28" style={{ background: `linear-gradient(180deg, ${BRAND.bg} 0%, ${BRAND.heroGradEnd} 100%)` }}>
          <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
            <FadeIn>
              <h1 className="text-4xl font-bold text-white md:text-5xl">Sobre NELVYON</h1>
              <p className="mt-6 text-lg leading-relaxed" style={{ color: BRAND.textMuted }}>
                Nacimos con una misión clara: que cualquier negocio acceda al mismo marketing digital que las
                grandes marcas, sin pagar agencias prohibitivas ni aprender diez herramientas distintas.
              </p>
            </FadeIn>
          </div>
        </section>

        <section className="py-16 md:py-24" style={{ backgroundColor: BRAND.bgSoft }}>
          <div className="mx-auto max-w-3xl space-y-6 px-4 text-lg leading-relaxed md:px-6">
            <FadeIn>
              <p>
                En 2018 empezamos como consultoría boutique en Barcelona. Vimos cómo las pymes españolas
                pagaban miles de euros al mes por SEO, ads, email y webs por separado — y aun así no tenían una
                visión unificada de qué funcionaba.
              </p>
            </FadeIn>
            <FadeIn delay={0.05}>
              <p>
                Construimos tecnología propia para ejecutar campañas más rápido y con mejor datos. Hoy somos
                agencia y software: ejecutamos por ti o te damos las herramientas para hacerlo internamente.
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p style={{ color: BRAND.cyan }}>
                Existimos para dar a cualquier negocio acceso a herramientas de marketing de alto nivel.
              </p>
            </FadeIn>
          </div>
        </section>

        <section className="py-20 md:py-28" style={{ backgroundColor: BRAND.bg }}>
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <FadeIn>
              <SectionHeading light center title="Nuestros valores" />
            </FadeIn>
            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {VALUES.map((v, i) => (
                <FadeIn delay={i * 0.06} key={v.title}>
                  <div
                    className="rounded-2xl border p-6 text-center transition hover:border-[#0066FF]/40"
                    style={{ backgroundColor: BRAND.card, borderColor: BRAND.cardBorder }}
                  >
                    <p className="text-3xl" style={{ color: BRAND.blue }}>
                      ◆
                    </p>
                    <h3 className="mt-4 font-bold text-white">{v.title}</h3>
                    <p className="mt-2 text-sm">{v.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28" style={{ backgroundColor: BRAND.bgAlt }}>
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <FadeIn>
              <SectionHeading light center title="Tecnología que usamos" />
            </FadeIn>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              {TECH.map((t) => (
                <span
                  className="rounded-full border px-5 py-2 text-sm font-medium text-white"
                  key={t}
                  style={{ borderColor: BRAND.cardBorder, backgroundColor: BRAND.card }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28" style={{ backgroundColor: BRAND.bg }}>
          <div className="mx-auto max-w-3xl px-4 md:px-6">
            <FadeIn>
              <SectionHeading light center title="Visión 2026 — 2030" />
            </FadeIn>
            <div className="relative mt-12 border-l-2 pl-8" style={{ borderColor: BRAND.blue }}>
              {TIMELINE.map((item, i) => (
                <FadeIn delay={i * 0.1} key={item.year}>
                  <div className="relative mb-10">
                    <span
                      className="absolute -left-[2.55rem] flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: BRAND.blue }}
                    >
                      {item.year.slice(2)}
                    </span>
                    <p className="text-sm font-bold" style={{ color: BRAND.cyan }}>
                      {item.year}
                    </p>
                    <h3 className="text-xl font-bold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm">{item.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20" style={{ backgroundColor: BRAND.bgLight }}>
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-4 md:grid-cols-4 md:px-6">
            {STATS.map((s, i) => (
              <FadeIn delay={i * 0.05} key={s.l}>
                <motion.div className="text-center" initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}>
                  <p className="text-3xl font-bold text-zinc-900 md:text-4xl">{s.v}</p>
                  <p className="mt-1 text-sm text-zinc-600">{s.l}</p>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
