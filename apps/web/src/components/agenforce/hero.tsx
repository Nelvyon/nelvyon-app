import Image from "next/image";
import Link from "next/link";

import { SpotlightNew } from "@/components/premium/spotlight-new";

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
    <section className="nelvyon-hero-v5 nelvyon-hero-v5--cinematic" aria-labelledby="home-hero-title">
      <SpotlightNew className="nelvyon-hero-v5__spotlight-wrap">
        <div className="nelvyon-hero-v5__backdrop" aria-hidden>
          <Image
            src={HERO_VISUAL_SRC}
            alt=""
            fill
            priority
            className="nelvyon-hero-v5__bg-img"
            sizes="100vw"
          />
          <div className="nelvyon-hero-v5__scrim" />
          <div className="nelvyon-hero-v5__glow-spot" />
        </div>

        <div className="nelvyon-hero-v5__foreground">
          <Container className="nelvyon-hero-v5__content">
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
        </div>
      </SpotlightNew>
    </section>
  );
};
