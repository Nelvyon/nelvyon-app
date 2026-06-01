import Link from "next/link";

import { Container } from "./container";
import { NELVYON_SLOGAN } from "./marketing-brand";

const AUDIENCE = ["Agencias", "Pymes", "Ecommerce", "Consultoras"] as const;

const HIGHLIGHTS = [
  {
    label: "Qué es",
    text: "Firma de marketing y operación digital con servicios profesionales y plataforma SaaS propia.",
  },
  {
    label: "Para quién",
    text: "Equipos y negocios que necesitan ejecutar con orden, continuidad y entregables reales.",
  },
  {
    label: "Qué hace",
    text: "Ejecuta campañas, web, ecommerce y operación comercial. Centraliza CRM, reporting e integraciones.",
  },
] as const;

export const Hero = () => {
  return (
    <section className="nelvyon-hero-v5" aria-labelledby="home-hero-title">
      <Container className="nelvyon-hero-v5__inner">
        <p className="mkt-eyebrow nelvyon-hero-v5__eyebrow">NELVYON · Servicios + Plataforma</p>
        <h1 id="home-hero-title" className="nelvyon-hero-v5__title">
          Marketing y operación digital para equipos que necesitan{" "}
          <span className="nelvyon-text-accent">ejecutar con orden</span>
        </h1>
        <p className="nelvyon-hero-v5__slogan">{NELVYON_SLOGAN}</p>
        <p className="nelvyon-hero-v5__subtitle">
          NELVYON combina ejecución profesional y plataforma propia para coordinar captación, marca, web,
          ecommerce y operación comercial sin fragmentar herramientas.
        </p>
        <div className="nelvyon-hero-v5__highlights" aria-label="Resumen NELVYON">
          {HIGHLIGHTS.map((item) => (
            <article key={item.label} className="nelvyon-hero-v5__highlight">
              <p className="nelvyon-hero-v5__highlight-label">{item.label}</p>
              <p className="nelvyon-hero-v5__highlight-text">{item.text}</p>
            </article>
          ))}
        </div>
        <div className="nelvyon-hero-v5__audience" aria-label="Perfiles habituales">
          {AUDIENCE.map((item) => (
            <span key={item} className="nelvyon-hero-v5__audience-pill">
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
