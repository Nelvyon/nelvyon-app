import Link from "next/link";

import { Container } from "./container";
import { SAAS_CAPABILITIES } from "./home-services-config";
import { NELVYON_SLOGAN } from "./marketing-brand";

const PLATFORM_SERVICES = [
  "SEO, Ads, Email y Social",
  "Branding, Web y Ecommerce",
  "Automatización y CRM",
  "Reporting e integraciones",
] as const;

export const Hero = () => {
  return (
    <section className="nelvyon-hero-v5 nelvyon-hero-v5--dark" aria-labelledby="home-hero-title">
      <div className="nelvyon-hero-v5__glow" aria-hidden />
      <Container className="nelvyon-hero-v5__inner">
        <p className="nelvyon-hero-v5__eyebrow">NELVYON · Servicios + Plataforma</p>
        <h1 id="home-hero-title" className="nelvyon-hero-v5__title">
          Marketing y operación digital para equipos que necesitan{" "}
          <span className="nelvyon-hero-v5__title-accent">ejecutar con orden</span>
        </h1>
        <p className="nelvyon-hero-v5__slogan">{NELVYON_SLOGAN}</p>
        <p className="nelvyon-hero-v5__subtitle">
          Firma de marketing y operación digital. Ejecutamos con servicios profesionales y
          centralizamos con plataforma SaaS propia cuando el volumen lo requiere.
        </p>
        <div className="nelvyon-hero-v5__ctas">
          <a href="/contacto" className="mkt-btn nelvyon-btn-primary">
            Solicitar información
          </a>
          <Link href="/servicios" className="mkt-btn nelvyon-btn-outline nelvyon-btn-outline--light">
            Ver servicios
          </Link>
        </div>
      </Container>

      <Container className="nelvyon-hero-v5__platform-wrap">
        <div className="nelvyon-hero-v5__platform" aria-label="Servicios y plataforma NELVYON">
          <article className="nelvyon-hero-v5__platform-col">
            <p className="nelvyon-hero-v5__platform-label">Servicios profesionales</p>
            <h2 className="nelvyon-hero-v5__platform-title">Ejecución con entregables definidos</h2>
            <ul className="nelvyon-hero-v5__platform-list">
              {PLATFORM_SERVICES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link href="/servicios" className="nelvyon-hero-v5__platform-link">
              Ver servicios →
            </Link>
          </article>
          <div className="nelvyon-hero-v5__platform-divider" aria-hidden />
          <article className="nelvyon-hero-v5__platform-col nelvyon-hero-v5__platform-col--saas">
            <p className="nelvyon-hero-v5__platform-label">Plataforma SaaS</p>
            <h2 className="nelvyon-hero-v5__platform-title">Centralización operativa</h2>
            <ul className="nelvyon-hero-v5__platform-list">
              {SAAS_CAPABILITIES.map((cap) => (
                <li key={cap.title}>
                  <strong>{cap.title}</strong> — {cap.desc}
                </li>
              ))}
            </ul>
            <Link href="/saas" className="nelvyon-hero-v5__platform-link">
              Ver plataforma SaaS →
            </Link>
          </article>
        </div>
      </Container>
    </section>
  );
};
