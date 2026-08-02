"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { pricingPlans } from "../content/siteContent";
import { AiorCtaBand, AiorPageHero } from "./AiorPageHero";
import { AiorFaq } from "./AiorFaq";

const FAQ = [
  {
    question: "¿Los precios SaaS son mensuales?",
    answer: "Sí. Starter (€97), Growth (€297) y Elite (€797) se facturan mensualmente según el alcance de la operación.",
  },
  {
    question: "¿La agencia usa los mismos precios?",
    answer:
      "No. Los servicios de agencia se presupuestan a medida. El plan SaaS licencia el software; la ejecución de agencia se cotiza aparte.",
  },
  {
    question: "¿Hay periodo de prueba?",
    answer:
      "La activación se acuerda en demo o discovery. No publicamos trials genéricos ni descuentos inventados en esta página.",
  },
] as const;

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
      <AiorPageHero
        eyebrow="Precios"
        title="SaaS y Agencia, claramente separados"
        description="El plan SaaS licencia el software. Los servicios de agencia se presupuestan a medida. Nunca mezclamos ambos en una sola tarjeta confusa ni publicamos precios demo."
        primaryCta={{ label: "Solicitar demo SaaS", href: "/contacto" }}
        secondaryCta={{ label: "Presupuesto agencia", href: "/contacto?tipo=agencia" }}
        imageSrc="/brand/public/saas-shots/billing.webp"
        imageAlt="Facturación y planes SaaS NELVYON"
      />

      <section className="space overflow-hidden">
        <div className="container th-container5">
          <div className="d-flex justify-content-center mb-40 gap-2" role="tablist" aria-label="Tipo de precio">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "saas"}
              className={`th-btn2 ${tab === "saas" ? "btn-gradient2" : "style5"}`}
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
              aria-selected={tab === "agencia"}
              className={`th-btn2 ${tab === "agencia" ? "btn-gradient2" : "style5"}`}
              onClick={() => {
                setTab("agencia");
                window.history.replaceState(null, "", "#agencia");
              }}
            >
              Presupuesto Agencia
            </button>
          </div>

          {tab === "saas" ? (
            <div className="row gy-4 justify-content-center" id="saas">
              {pricingPlans.map((plan) => (
                <div key={plan.id} className="col-md-6 col-xl-4">
                  <div
                    style={{
                      padding: 32,
                      borderRadius: 16,
                      border: plan.featured ? "2px solid #0084FF" : "1px solid #E0E0E0",
                      height: "100%",
                      background: "#fff",
                    }}
                  >
                    {plan.featured ? (
                      <span className="sub-title style3">Recomendado</span>
                    ) : null}
                    <h3 className="h5">{plan.name}</h3>
                    <p className="h2" style={{ color: "#0084FF" }}>
                      {plan.priceLabel}
                      {plan.period ? <span className="h6 text-muted"> {plan.period}</span> : null}
                    </p>
                    <p>{plan.description}</p>
                    <ul className="hero-list" style={{ textAlign: "left" }}>
                      {plan.features.map((f) => (
                        <li key={f}>
                          <i className="fa-sharp fa-solid fa-circle-check" aria-hidden /> {f}
                        </li>
                      ))}
                    </ul>
                    <Link href={plan.cta.href} className="th-btn2 btn-gradient2 mt-3 d-inline-block">
                      {plan.cta.label}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div id="agencia" style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
              <h2 className="sec-title h3">Agencia a medida</h2>
              <p>
                SEO, ads, branding, contenido, web, email, packs OS y automatización se cotizan según alcance,
                sector y volumen. No hay tarifa plana de agencia en esta página porque cada operación es distinta.
              </p>
              <ul className="hero-list" style={{ display: "inline-block", textAlign: "left" }}>
                <li>
                  <i className="fa-sharp fa-solid fa-circle-check" aria-hidden /> Propuesta con alcance explícito
                </li>
                <li>
                  <i className="fa-sharp fa-solid fa-circle-check" aria-hidden /> SaaS facturado aparte si aplica
                </li>
                <li>
                  <i className="fa-sharp fa-solid fa-circle-check" aria-hidden /> Portal de aprobación de entregables
                </li>
              </ul>
              <div className="btn-group justify-content-center mt-4">
                <Link href="/contacto?tipo=agencia" className="th-btn2 btn-gradient2">
                  Pedir presupuesto
                </Link>
                <Link href="/agencia" className="th-btn2 style5">
                  Conocer la agencia
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="space overflow-hidden" style={{ background: "#F4F7FF" }}>
        <div className="container th-container5">
          <div className="title-area text-center mb-40">
            <span className="sub-title style3">[ FAQ ]</span>
            <h2 className="sec-title h3">Preguntas sobre precios</h2>
          </div>
          <AiorFaq items={[...FAQ]} />
        </div>
      </section>

      <AiorCtaBand
        title="Elija plan SaaS o presupuesto de agencia"
        body="Le ayudamos a separar licencia de software y ejecución de marketing con claridad."
        primaryCta={{ label: "Contactar", href: "/contacto" }}
        secondaryCta={{ label: "Ver SaaS", href: "/producto" }}
      />
    </>
  );
}
