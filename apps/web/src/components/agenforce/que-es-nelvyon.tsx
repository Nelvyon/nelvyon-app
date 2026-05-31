import Link from "next/link";

import { NELVYON_BLUE, NELVYON_NAVY } from "./marketing-brand";

const CAPAS = [
  {
    key: "01",
    title: "NELVYON SaaS",
    desc: "CRM, campañas, automatización, reporting, comunicación y operación.",
    href: "/saas",
    cta: "Ver plataforma SaaS",
  },
  {
    key: "02",
    title: "NELVYON OS",
    desc: "Motor que impulsa la ejecución y los servicios premium.",
    href: "/servicios",
    cta: "Ver servicios",
  },
  {
    key: "03",
    title: "Servicios Premium",
    desc: "SEO, Ads, Branding, Ecommerce, Automatización y crecimiento.",
    href: "/servicios",
    cta: "Explorar servicios",
  },
];

export function QueEsNelvyon() {
  return (
    <section className="nelvyon-home-section nelvyon-section--white nelvyon-que-es-section">
      <div className="nelvyon-section-inner">
        <div className="nelvyon-que-es-grid">
          <div>
            <p className="mkt-eyebrow">Qué es NELVYON</p>
            <h2 className="mkt-h2 mkt-h2--display fade-in" style={{ marginBottom: 20 }}>
              Una plataforma con tres capas claras
            </h2>
            <p className="mkt-lead" style={{ marginBottom: 12 }}>
              Software operativo para centralizar marketing, ventas, automatización y operación. Sin capas ocultas ni
              promesas vacías.
            </p>
            <p style={{ fontSize: 15, fontWeight: 650, color: NELVYON_NAVY, letterSpacing: "-0.02em", margin: 0 }}>
              SaaS para operar. OS para ejecutar. Servicios cuando hace falta acompañamiento.
            </p>
          </div>
          <div className="nelvyon-capas-stack">
            {CAPAS.map((c) => (
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
