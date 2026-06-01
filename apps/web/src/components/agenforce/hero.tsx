import Image from "next/image";
import Link from "next/link";

import { Container } from "./container";
import { NELVYON_SLOGAN } from "./marketing-brand";

const HERO_VISUAL_SRC = "/images/nelvyon-hero-visual.png";

const HERO_FACTS = [
  "Servicios + plataforma",
  "Integraciones operativas",
  "Proceso documentado",
  "Sin promesas vacías",
] as const;

export const Hero = () => {
  return (
    <section className="nelvyon-hero-v5 nelvyon-hero-v5--enterprise" aria-labelledby="home-hero-title">
      <div className="nelvyon-hero-v5__ambient" aria-hidden />
      <Container className="nelvyon-hero-v5__layout">
        <div className="nelvyon-hero-v5__copy">
          <p className="nelvyon-hero-v5__badge">
            <span className="nelvyon-hero-v5__badge-dot" aria-hidden />
            SaaS + Servicios de marketing
          </p>
          <h1 id="home-hero-title" className="nelvyon-hero-v5__title">
            Marketing y operación digital para equipos que necesitan{" "}
            <span className="nelvyon-hero-v5__title-accent">ejecutar con orden</span>
          </h1>
          <p className="nelvyon-hero-v5__slogan">{NELVYON_SLOGAN}</p>
          <p className="nelvyon-hero-v5__subtitle">
            Servicios profesionales y plataforma SaaS para operar marketing, ventas y reporting con
            continuidad. Firma de operación digital, no agencia genérica.
          </p>
          <div className="nelvyon-hero-v5__ctas">
            <a href="/contacto" className="mkt-btn nelvyon-btn-primary nelvyon-hero-v5__cta-primary">
              Solicitar información
            </a>
            <Link href="/servicios" className="mkt-btn nelvyon-btn-outline nelvyon-btn-outline--light">
              Ver servicios
            </Link>
          </div>
        </div>
        <div className="nelvyon-hero-v5__visual">
          <div className="nelvyon-hero-v5__visual-glow" aria-hidden />
          <div className="nelvyon-hero-v5__visual-glow nelvyon-hero-v5__visual-glow--ring" aria-hidden />
          <Image
            src={HERO_VISUAL_SRC}
            alt="Composición visual de la plataforma y operación digital NELVYON"
            width={1400}
            height={1050}
            priority
            className="nelvyon-hero-v5__visual-img"
            sizes="(max-width: 899px) 92vw, min(58vw, 720px)"
          />
        </div>
      </Container>

      <Container className="nelvyon-hero-v5__facts-wrap">
        <ul className="nelvyon-hero-v5__facts">
          {HERO_FACTS.map((fact) => (
            <li key={fact} className="nelvyon-hero-v5__fact">
              {fact}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
};
