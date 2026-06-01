import Link from "next/link";

import { Container } from "./container";
import { NELVYON_SLOGAN } from "./marketing-brand";

const AUDIENCE = ["Agencias", "Pymes", "Ecommerce", "Consultoras"] as const;

/** Hero V5 — eslogan de marca, autoridad GHL, sin mockups. */
export const Hero = () => {
  return (
    <section className="nelvyon-hero-v5" aria-labelledby="home-hero-title">
      <Container className="nelvyon-hero-v5__inner">
        <p className="mkt-eyebrow nelvyon-hero-v5__eyebrow">NELVYON · Servicios + Plataforma</p>
        <h1 id="home-hero-title" className="nelvyon-hero-v5__title">
          {NELVYON_SLOGAN}
        </h1>
        <p className="nelvyon-hero-v5__subtitle">
          Firma de marketing y operación digital. Ejecutamos con{" "}
          <strong>servicios profesionales</strong> y centralizamos con{" "}
          <strong>plataforma SaaS propia</strong>.
        </p>
        <p className="nelvyon-hero-v5__lead">
          Coordinamos campañas, CRM, web, ecommerce y reporting para equipos que necesitan orden
          operativo, continuidad comercial y entregables reales — sin fragmentar herramientas.
        </p>
        <div className="nelvyon-hero-v5__audience" aria-label="Perfiles habituales">
          {AUDIENCE.map((item, index) => (
            <span key={item} className="nelvyon-hero-v5__audience-pill">
              {index > 0 ? <span className="nelvyon-hero-v5__audience-sep" aria-hidden>·</span> : null}
              {item}
            </span>
          ))}
        </div>
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
