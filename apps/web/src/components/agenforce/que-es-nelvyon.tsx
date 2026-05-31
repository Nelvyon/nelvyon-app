import Link from "next/link";

import { NELVYON_BLUE, NELVYON_NAVY } from "./marketing-brand";

const PILARES = [
  {
    key: "01",
    title: "NELVYON SaaS",
    desc: "CRM, campañas, workflows, inbox, facturación, calendario, funnels y reporting en un solo entorno.",
    href: "/saas",
    cta: "Ver plataforma SaaS",
  },
  {
    key: "02",
    title: "Servicios",
    desc: "SEO, Ads, Branding, Desarrollo Web, Ecommerce y Automatización con entregables definidos.",
    href: "/servicios",
    cta: "Ver servicios",
  },
];

export function QueEsNelvyon() {
  return (
    <section className="nelvyon-home-section nelvyon-section--white nelvyon-que-es-section" aria-labelledby="que-es-nelvyon-title">
      <div className="nelvyon-section-inner">
        <div className="nelvyon-que-es-grid">
          <div>
            <p className="mkt-eyebrow">Qué es NELVYON</p>
            <h2 id="que-es-nelvyon-title" className="mkt-h2 mkt-h2--display fade-in" style={{ marginBottom: 20 }}>
              Software y servicios, con roles claros
            </h2>
            <p className="mkt-lead" style={{ marginBottom: 12 }}>
              Plataforma operativa para centralizar marketing, ventas y operación. Servicios profesionales cuando la
              ejecución requiere acompañamiento especializado.
            </p>
            <p style={{ fontSize: 15, fontWeight: 650, color: NELVYON_NAVY, letterSpacing: "-0.02em", margin: 0 }}>
              SaaS para operar. Servicios para ejecutar cuando hace falta.
            </p>
          </div>
          <div className="nelvyon-capas-stack nelvyon-capas-stack--two">
            {PILARES.map((c) => (
              <article key={c.key} className="mkt-card nelvyon-capa-card nelvyon-capa-card--layer">
                <span className="nelvyon-capa-card__key">{c.key}</span>
                <div>
                  <h3 className="mkt-card__title">{c.title}</h3>
                  <p className="mkt-card__desc">{c.desc}</p>
                  <Link href={c.href} className="nelvyon-capa-card__link">
                    {c.cta} →
                  </Link>
                </div>
                <span className="nelvyon-capa-card__dot" style={{ background: NELVYON_BLUE }} aria-hidden />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
