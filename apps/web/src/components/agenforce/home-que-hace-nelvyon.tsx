import Link from "next/link";

import { HOME_SERVICES, SAAS_CAPABILITIES } from "./home-services-config";

export function HomeQueHaceNelvyon() {
  return (
    <section
      className="nelvyon-home-section nelvyon-section--white nelvyon-que-hace"
      aria-labelledby="que-hace-nelvyon-title"
    >
      <div className="nelvyon-section-inner">
        <header className="nelvyon-home-section__head nelvyon-home-section__head--center">
          <p className="mkt-eyebrow">Qué hace NELVYON</p>
          <h2 id="que-hace-nelvyon-title" className="mkt-h2 mkt-h2--display">
            A qué se dedica NELVYON
          </h2>
          <p className="mkt-lead nelvyon-home-section__lead">
            Ejecutamos marketing y operación digital con servicios profesionales. Cuando el volumen lo
            requiere, centralizamos campañas, CRM y reporting en plataforma SaaS propia.
          </p>
        </header>
        <div className="nelvyon-que-hace__grid">
          <div className="nelvyon-que-hace__col">
            <p className="nelvyon-que-hace__label">Servicios profesionales</p>
            <p className="nelvyon-que-hace__intro">
              Ejecutamos captación, identidad, web, ecommerce, email, social, analítica y operación
              comercial con entregables definidos y seguimiento operativo.
            </p>
            <ul className="nelvyon-que-hace__list">
              {HOME_SERVICES.map((service) => (
                <li key={service.title}>
                  <Link href={service.href} className="nelvyon-que-hace__list-link">
                    <span className="nelvyon-que-hace__list-title">{service.title}</span>
                    <span className="nelvyon-que-hace__list-desc">{service.desc}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/servicios" className="mkt-link nelvyon-que-hace__cta">
              Ver servicios →
            </Link>
          </div>
          <div className="nelvyon-que-hace__col nelvyon-que-hace__col--saas">
            <p className="nelvyon-que-hace__label">Plataforma SaaS · apoyo operativo</p>
            <p className="nelvyon-que-hace__intro">
              La plataforma no sustituye la ejecución: la sostiene. Centraliza campañas, CRM,
              automatizaciones e integraciones cuando conviene operar con continuidad.
            </p>
            <ul className="nelvyon-que-hace__list">
              {SAAS_CAPABILITIES.map((cap) => (
                <li key={cap.title}>
                  <div className="nelvyon-que-hace__list-item">
                    <span className="nelvyon-que-hace__list-title">{cap.title}</span>
                    <span className="nelvyon-que-hace__list-desc">{cap.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/saas" className="mkt-link nelvyon-que-hace__cta">
              Ver plataforma SaaS →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
