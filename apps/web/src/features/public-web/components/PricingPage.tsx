"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { agencyServices } from "../content/catalog";
import { pricingPlans } from "../content/siteContent";
import { FaqAccordion } from "./DeepPage";
import { PricingGrid } from "./sections/PricingGrid";
import { Reveal } from "./Reveal";
import { Container, CtaBand, PageHero, SectionHeading, SectionShell } from "./ui";

export function PricingPage() {
  const [tab, setTab] = useState<"saas" | "agencia">("saas");

  useEffect(() => {
    const apply = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "agencia") setTab("agencia");
      if (hash === "saas") setTab("saas");
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  return (
    <>
      <PageHero
        eyebrow="Precios"
        title="SaaS y Agencia, claramente separados"
        description="El plan SaaS licencia el software. Los servicios de agencia se presupuestan a medida. Nunca mezclamos ambos en una sola tarjeta confusa."
        primaryCta={{ label: "Solicitar demo SaaS", href: "/contacto" }}
        secondaryCta={{ label: "Pedir presupuesto agencia", href: "/contacto?tipo=agencia" }}
        productMock
      />

      <SectionShell className="!py-10">
        <Container>
          <div className="flex justify-center">
            <div className="nv-public-tabs" role="tablist" aria-label="Tipo de precio">
              <button
                type="button"
                role="tab"
                className="nv-public-tab"
                data-active={tab === "saas"}
                aria-selected={tab === "saas"}
                onClick={() => {
                  setTab("saas");
                  window.history.replaceState(null, "", "#saas");
                }}
              >
                Precios del SaaS
              </button>
              <button
                type="button"
                role="tab"
                className="nv-public-tab"
                data-active={tab === "agencia"}
                aria-selected={tab === "agencia"}
                onClick={() => {
                  setTab("agencia");
                  window.history.replaceState(null, "", "#agencia");
                }}
              >
                Servicios de Agencia
              </button>
            </div>
          </div>
        </Container>
      </SectionShell>

      {tab === "saas" ? (
        <div id="saas">
          <PricingGrid
            plans={pricingPlans}
            eyebrow="Licencia software"
            title="Planes mensuales del SaaS NELVYON"
            description="Starter, Growth y Elite. Facturación en euros. El alcance exacto se confirma en onboarding. No incluye producción creativa de agencia."
          />
          <SectionShell>
            <Container className="grid gap-10 lg:grid-cols-2">
              <Reveal>
                <SectionHeading
                  eyebrow="Qué incluye el SaaS"
                  title="Software operativo, no un pack creativo"
                  description="CRM, campañas, workflows, inbox, billing y portal según plan. La agencia es opcional y aparte."
                />
                <ul className="mt-6 space-y-3 text-sm text-[var(--nv-muted)] md:text-base">
                  {[
                    "Acceso multi-tenant al panel /saas/*",
                    "Módulos documentados en /producto",
                    "Integraciones nativas según configuración",
                    "Soporte según plan (email / prioritario / AM)",
                  ].map((b) => (
                    <li key={b} className="flex gap-3">
                      <Image src="/brand/public/product/check-circle.png" alt="" width={20} height={20} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delayMs={40}>
                <SectionHeading eyebrow="FAQ precios SaaS" title="Preguntas frecuentes" />
                <div className="mt-6">
                  <FaqAccordion
                    items={[
                      {
                        question: "¿Puedo pagar solo agencia sin SaaS?",
                        answer: "Sí, pero muchos entregables se ejecutan mejor sobre el motor SaaS. Lo evaluamos en discovery.",
                      },
                      {
                        question: "¿Hay descuento anual?",
                        answer: "El toggle anual muestra el equivalente a 10 meses (2 de ahorro) sobre el precio mensual publicado.",
                      },
                      {
                        question: "¿Elite incluye media spend?",
                        answer: "No. El spend publicitario es del cliente.",
                      },
                    ]}
                  />
                </div>
              </Reveal>
            </Container>
          </SectionShell>
        </div>
      ) : (
        <div id="agencia">
          <SectionShell soft>
            <Container>
              <Reveal>
                <SectionHeading
                  eyebrow="Presupuesto personalizado"
                  title="Servicios de Agencia — sin precio de lista genérico"
                  description="Cada proyecto se presupuesta tras discovery: alcance, plazos, entregables y si requiere plan SaaS. No publicamos un ‘pack creativo’ falso como si fuera SaaS."
                  align="center"
                />
              </Reveal>
              <div className="mt-12 grid gap-4 md:grid-cols-2">
                {agencyServices.map((svc, i) => (
                  <Reveal key={svc.id} delayMs={i * 40}>
                    <article className="nv-public-icon-card">
                      <div className="relative mb-5 aspect-[16/9] overflow-hidden rounded-xl border border-[var(--nv-border)]">
                        <Image src={svc.image} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 40vw" />
                      </div>
                      <h3 className="text-xl font-semibold text-[var(--nv-fg-strong)]">{svc.name}</h3>
                      <p className="mt-2 text-sm text-[var(--nv-muted)]">{svc.short}</p>
                      <p className="mt-4 text-sm font-medium text-[var(--nv-fg)]">Problema: {svc.problem}</p>
                      <p className="mt-2 text-sm text-[var(--nv-muted)]">Enfoque: {svc.solution}</p>
                      <ul className="mt-4 space-y-1.5 text-sm text-[var(--nv-muted)]">
                        {svc.deliverables.slice(0, 4).map((d) => (
                          <li key={d}>· {d}</li>
                        ))}
                      </ul>
                      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                        <Link href={svc.href} className="nv-public-btn nv-public-btn-secondary !min-h-10 !text-sm">
                          Ver servicio
                        </Link>
                        <Link
                          href={`/contacto?tipo=agencia&servicio=${svc.id}`}
                          className="nv-public-btn nv-public-btn-primary !min-h-10 !text-sm"
                        >
                          Pedir presupuesto
                        </Link>
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
              <div className="mx-auto mt-12 max-w-3xl">
                <FaqAccordion
                  items={[
                    {
                      question: "¿Por qué no hay precio fijo de agencia?",
                      answer:
                        "Porque el alcance varía (web, SEO, ads, packs, automatización). Un precio único sería marketing vacío.",
                    },
                    {
                      question: "¿Cuánto tarda un presupuesto?",
                      answer: "Tras un discovery breve solemos devolver propuesta con hitos y exclusiones claras.",
                    },
                    {
                      question: "¿Puedo contratar agencia + SaaS juntos?",
                      answer: "Sí. Se cotizan en líneas separadas: licencia SaaS + honorarios de agencia.",
                    },
                  ]}
                />
              </div>
            </Container>
          </SectionShell>
        </div>
      )}

      <CtaBand
        title="¿SaaS, Agencia o ambos?"
        body="Le ayudamos a decidir el mix correcto sin mezclar conceptos de precio."
        primaryCta={{ label: "Hablar con NELVYON", href: "/contacto" }}
        secondaryCta={{ label: "Explorar el SaaS", href: "/producto" }}
      />
    </>
  );
}
