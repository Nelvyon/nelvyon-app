import Link from "next/link";

import { Container } from "./container";

const AUDIENCE = ["Agencias", "Pymes", "Ecommerce", "Consultoras"] as const;

/** Hero V5 — institucional, tipografía dominante, sin mockups ni paneles laterales. */
export const Hero = () => {
  return (
    <section className="nelvyon-hero-v5" aria-labelledby="home-hero-title">
      <Container className="nelvyon-hero-v5__inner">
        <p className="mkt-eyebrow nelvyon-hero-v5__eyebrow">Servicios + Plataforma</p>
        <h1 id="home-hero-title" className="nelvyon-hero-v5__title">
          Marketing y operación digital para equipos que necesitan{" "}
          <span className="nelvyon-text-accent">ejecutar con orden</span>
        </h1>
        <p className="nelvyon-hero-v5__lead">
          Servicios profesionales y plataforma SaaS propia. Un entorno para coordinar campañas, CRM y operación
          comercial sin fragmentar herramientas.
        </p>
        <p className="nelvyon-hero-v5__audience">
          {AUDIENCE.map((item, index) => (
            <span key={item}>
              {index > 0 ? <span className="nelvyon-hero-v5__audience-sep" aria-hidden>·</span> : null}
              {item}
            </span>
          ))}
        </p>
        <div className="nelvyon-hero-v5__ctas">
          <a href="/contacto" className="mkt-btn nelvyon-btn-primary nelvyon-btn-primary--solid">
            Solicitar información
          </a>
          <Link href="/servicios" className="mkt-btn nelvyon-btn-outline">
            Ver servicios
          </Link>
        </div>
        <Link href="/saas" className="nelvyon-hero-v5__saas-link">
          Ver plataforma SaaS →
        </Link>
      </Container>
    </section>
  );
};
