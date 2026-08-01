import Link from "next/link";

import { pricingPlans } from "../content/siteContent";
import { Reveal } from "./Reveal";
import { Container, CtaBand, PageHero, SectionHeading } from "./ui";

export function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Planes SaaS"
        title="Precios claros para operar con orden"
        description="Planes mensuales en euros alineados a la escala de su operación: Starter, Growth y Elite."
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Ver plataforma", href: "/plataforma" }}
      />
      <section className="py-14 md:py-20">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Facturación mensual"
              title="Elija el plan que encaje con su operación"
              description="El alcance exacto se confirma en el onboarding. Sin textos de demo ni precios ficticios."
              align="center"
            />
          </Reveal>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {pricingPlans.map((plan, i) => (
              <Reveal key={plan.id} delayMs={i * 50}>
                <article
                  className={`nv-public-panel relative flex h-full flex-col p-7 ${
                    plan.featured ? "border-[rgba(0,132,255,0.45)] ring-1 ring-[rgba(0,132,255,0.25)]" : ""
                  }`}
                >
                  {plan.featured ? (
                    <span className="absolute right-5 top-5 rounded-full bg-[rgba(0,132,255,0.15)] px-3 py-1 text-xs font-semibold text-[var(--nv-accent)]">
                      {"badge" in plan && typeof plan.badge === "string" ? plan.badge : "Recomendado"}
                    </span>
                  ) : null}
                  <h2 className="text-xl font-semibold text-white">{plan.name}</h2>
                  <p className="mt-2 text-sm text-[var(--nv-muted)]">{plan.description}</p>
                  <p className="mt-6 flex items-end gap-1">
                    <span className="nv-public-display text-4xl text-white">{plan.priceLabel}</span>
                    <span className="pb-1 text-sm text-[var(--nv-muted)]">{plan.period}</span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-3 text-sm text-slate-300">
                        <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nv-accent)]" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.cta.href}
                    className={`nv-public-btn mt-8 w-full ${
                      plan.featured ? "nv-public-btn-primary" : "nv-public-btn-secondary"
                    }`}
                  >
                    {plan.cta.label}
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
      <CtaBand
        title="¿Necesita un alcance enterprise?"
        body="Arquitectura a medida, SLA e integraciones avanzadas en Elite o con propuesta dedicada."
        primaryCta={{ label: "Hablar con Enterprise", href: "/enterprise" }}
        secondaryCta={{ label: "Contacto", href: "/contacto" }}
      />
    </>
  );
}
