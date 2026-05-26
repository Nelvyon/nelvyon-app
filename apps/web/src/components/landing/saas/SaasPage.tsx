"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

import { SAAS_FAQ } from "../agencyContent";
import { FaqSection } from "../FaqSection";
import { FadeIn } from "../FadeIn";
import { LandingFooter } from "../LandingFooter";
import { MarketingNavbar } from "../MarketingNavbar";
import { BRAND } from "../shared";
import { PrimaryButton, SectionHeading } from "../ui";

const PLANS = [
  {
    name: "Starter",
    price: "€97",
    users: "Hasta 3 usuarios",
    features: ["CRM básico", "Email marketing", "Web Builder", "Soporte email"],
    highlight: false,
  },
  {
    name: "Growth",
    price: "€297",
    users: "Hasta 10 usuarios",
    features: [
      "Todos los módulos",
      "Publicidad IA",
      "Analytics avanzado",
      "Automatización completa",
      "Soporte prioritario",
    ],
    highlight: true,
  },
  {
    name: "Elite",
    price: "€797",
    users: "Ilimitado",
    features: ["Account manager", "SLA 99.9%", "API + webhooks", "White-label"],
    highlight: false,
  },
] as const;

const FEATURES = [
  "CRM y pipeline de ventas",
  "Email, SMS y WhatsApp",
  "SEO y contenido IA",
  "Google, Meta y TikTok Ads",
  "Web Builder y funnels",
  "Analytics y reportes",
  "Automatización visual",
  "Firma digital y presupuestos",
] as const;

const COMPARE = [
  { feature: "Precio entrada", nelvyon: "€97/mes", hubspot: "€800+", ghl: "€97", ac: "€29+" },
  { feature: "Todo en uno", nelvyon: "✓", hubspot: "Parcial", ghl: "✓", ac: "Email" },
  { feature: "Publicidad IA", nelvyon: "✓", hubspot: "—", ghl: "—", ac: "—" },
  { feature: "Web Builder", nelvyon: "✓", hubspot: "—", ghl: "✓", ac: "—" },
  { feature: "Soporte ES", nelvyon: "✓", hubspot: "✓", ghl: "EN", ac: "EN" },
] as const;

export function SaasPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: BRAND.bg, color: BRAND.textMuted, fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      <MarketingNavbar active="/saas" />
      <main>
        <section
          className="py-20 md:py-28"
          style={{ background: `linear-gradient(180deg, ${BRAND.bg} 0%, ${BRAND.heroGradEnd} 100%)` }}
        >
          <div className="mx-auto max-w-4xl px-4 text-center md:px-6">
            <FadeIn>
              <span className="text-sm font-medium uppercase tracking-widest" style={{ color: BRAND.cyan }}>
                NELVYON SaaS
              </span>
              <h1 className="mt-4 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
                La plataforma que reemplaza 20 herramientas
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg" style={{ color: BRAND.textMuted }}>
                CRM, email, ads, webs, automatización y analytics — un solo login, un solo precio.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <PrimaryButton href="/register">Empieza gratis 14 días</PrimaryButton>
                <Link className="rounded-full border border-white/20 px-6 py-3 text-sm text-white" href="#planes">
                  Ver planes
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="py-20 md:py-28" id="planes" style={{ backgroundColor: BRAND.bgSoft }}>
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <FadeIn>
              <SectionHeading light center title="Planes transparentes" subtitle="Sin costes ocultos. Escala cuando crezcas." />
            </FadeIn>
            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              {PLANS.map((plan, i) => (
                <FadeIn delay={i * 0.08} key={plan.name}>
                  <motion.div
                    className={`relative flex h-full flex-col rounded-2xl border p-8 backdrop-blur-md ${
                      plan.highlight ? "ring-2" : ""
                    }`}
                    style={{
                      backgroundColor: "rgba(10, 15, 30, 0.85)",
                      borderColor: plan.highlight ? BRAND.blue : BRAND.cardBorder,
                      ...(plan.highlight ? { ringColor: BRAND.blue } : {}),
                    }}
                    whileHover={{ y: -4 }}
                  >
                    {plan.highlight ? (
                      <span
                        className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold text-white"
                        style={{ backgroundColor: BRAND.blue }}
                      >
                        MÁS POPULAR
                      </span>
                    ) : null}
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <p className="mt-4">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      <span className="text-zinc-500">/mes</span>
                    </p>
                    <p className="mt-2 text-sm text-zinc-500">{plan.users}</p>
                    <ul className="mt-8 flex-1 space-y-3">
                      {plan.features.map((f) => (
                        <li className="flex gap-2 text-sm" key={f} style={{ color: BRAND.textMuted }}>
                          <Check className="h-5 w-5 shrink-0" style={{ color: BRAND.blue }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      className="mt-8 block rounded-full py-3 text-center text-sm font-semibold text-white"
                      href="/register"
                      style={{ backgroundColor: plan.highlight ? BRAND.blue : "transparent", border: plan.highlight ? "none" : `1px solid ${BRAND.cardBorder}` }}
                    >
                      Elegir plan
                    </Link>
                  </motion.div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28" style={{ backgroundColor: BRAND.bg }}>
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <FadeIn>
              <SectionHeading light center title="Todo incluido" subtitle="Una suscripción. Todas las herramientas." />
            </FadeIn>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f, i) => (
                <FadeIn delay={(i % 4) * 0.03} key={f}>
                  <div
                    className="rounded-xl border p-4 text-sm font-medium text-white transition hover:border-[#0066FF]/40"
                    style={{ backgroundColor: BRAND.card, borderColor: BRAND.cardBorder }}
                  >
                    {f}
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28" style={{ backgroundColor: BRAND.bgAlt }}>
          <div className="mx-auto max-w-5xl px-4 md:px-6">
            <FadeIn>
              <SectionHeading light center title="NELVYON vs la competencia" />
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="mt-10 overflow-x-auto rounded-2xl border" style={{ borderColor: BRAND.cardBorder }}>
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-black/40">
                      <th className="px-4 py-3 text-zinc-400">—</th>
                      <th className="px-4 py-3 font-bold" style={{ color: BRAND.blue }}>
                        NELVYON
                      </th>
                      <th className="px-4 py-3 text-zinc-400">HubSpot</th>
                      <th className="px-4 py-3 text-zinc-400">GoHighLevel</th>
                      <th className="px-4 py-3 text-zinc-400">ActiveCampaign</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARE.map((row) => (
                      <tr className="border-b border-white/5" key={row.feature}>
                        <td className="px-4 py-3 text-white">{row.feature}</td>
                        <td className="px-4 py-3 font-medium" style={{ color: BRAND.cyan }}>
                          {row.nelvyon}
                        </td>
                        <td className="px-4 py-3 text-zinc-500">{row.hubspot}</td>
                        <td className="px-4 py-3 text-zinc-500">{row.ghl}</td>
                        <td className="px-4 py-3 text-zinc-500">{row.ac}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </FadeIn>
          </div>
        </section>

        <FaqSection items={SAAS_FAQ} />

        <section className="py-20 md:py-28" style={{ backgroundColor: BRAND.bgSoft }}>
          <div className="mx-auto max-w-xl px-4 md:px-6">
            <FadeIn>
              <h2 className="text-center text-2xl font-bold text-white md:text-3xl">¿Tienes dudas? Hablemos</h2>
              <p className="mt-3 text-center text-sm" style={{ color: BRAND.textMuted }}>
                Te respondemos en menos de 24 horas laborables.
              </p>
              {sent ? (
                <p className="mt-8 text-center font-medium" style={{ color: BRAND.cyan }}>
                  ¡Gracias! Te contactaremos pronto.
                </p>
              ) : (
                <form
                  className="mt-8 space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSent(true);
                  }}
                >
                  <input
                    className="w-full rounded-xl border bg-black/40 px-4 py-3 text-white outline-none focus:ring-2"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    style={{ borderColor: BRAND.cardBorder }}
                    type="email"
                    value={email}
                  />
                  <button
                    className="w-full rounded-full py-3 text-sm font-semibold text-white"
                    style={{ backgroundColor: BRAND.blue }}
                    type="submit"
                  >
                    Solicitar demo
                  </button>
                </form>
              )}
            </FadeIn>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
