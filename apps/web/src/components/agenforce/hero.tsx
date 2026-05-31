import Link from "next/link";

import { Container } from "./container";
import { HOME_SERVICES } from "./home-services-config";

/** Hero V4 — Opción 1: dual columna, Servicios primero, SaaS como soporte. */
export const Hero = () => {
  return (
    <section className="nelvyon-hero-v4" aria-labelledby="home-hero-title">
      <Container className="nelvyon-hero-v4__inner">
        <div className="nelvyon-hero-v4__grid">
          <div className="nelvyon-hero-v4__main">
            <p className="mkt-eyebrow nelvyon-hero-v4__eyebrow">Servicios + Plataforma</p>
            <h1 id="home-hero-title" className="mkt-h1 nelvyon-hero-v4__title">
              Ejecutamos tu operación de marketing con{" "}
              <span className="nelvyon-text-accent">entregables reales</span>
            </h1>
            <p className="mkt-lead--light nelvyon-hero-v4__subtitle">
              SEO, publicidad, identidad, desarrollo web, ecommerce y automatización. Cuando hace falta escalar,
              centralizamos la operación en NELVYON SaaS.
            </p>
            <div className="nelvyon-hero-v4__ctas">
              <a href="/contacto" className="mkt-btn nelvyon-btn-primary">
                Solicitar información
              </a>
              <Link href="/servicios" className="mkt-btn nelvyon-btn-ghost">
                Ver servicios
              </Link>
            </div>
            <Link href="/saas" className="nelvyon-hero-v4__saas-link">
              Ver plataforma SaaS →
            </Link>
          </div>

          <aside className="nelvyon-hero-v4__aside" aria-label="Áreas de servicio">
            <ul className="nelvyon-hero-v4__service-list">
              {HOME_SERVICES.map((item) => (
                <li key={item.title}>
                  <Link href={item.href} className="nelvyon-hero-v4__service-item">
                    <span className="nelvyon-hero-v4__service-name">{item.title}</span>
                    <span className="nelvyon-hero-v4__service-arrow" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="nelvyon-hero-v4__saas-panel">
              <p className="nelvyon-hero-v4__saas-panel-label">Plataforma SaaS</p>
              <p className="nelvyon-hero-v4__saas-panel-text">
                Software propio para operar campañas, CRM, workflows y reporting cuando el volumen lo requiere.
              </p>
              <Link href="/saas" className="nelvyon-hero-v4__saas-panel-link">
                Conocer SaaS →
              </Link>
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
};
