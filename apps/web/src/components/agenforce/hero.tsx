import Link from "next/link";

import { SpotlightNew } from "@/components/premium/spotlight-new";

import { Container } from "./container";
import { HOME_COPY } from "./home-copy";

export const Hero = () => {
  const {
    titleBefore,
    titleAccent1,
    titleMid,
    titleAccent2,
    titleMid2,
    titleAccent3,
    titleEnd,
    subtitle,
    ctaPrimary,
    ctaSecondary,
  } = HOME_COPY.hero;

  return (
    <section className="nelvyon-hero-v3" aria-labelledby="home-hero-title">
      <SpotlightNew className="nelvyon-hero-v3__spotlight">
        <div className="nelvyon-hero-v3__atmosphere" aria-hidden>
          <div className="nelvyon-hero-v3__glow nelvyon-hero-v3__glow--primary" />
          <div className="nelvyon-hero-v3__glow nelvyon-hero-v3__glow--secondary" />
        </div>
        <Container className="nelvyon-hero-v3__container">
          <div className="nelvyon-hero-v3__copy">
            <h1 id="home-hero-title" className="nelvyon-hero-v3__title">
              {titleBefore}
              <span className="nelvyon-hero-v3__accent">{titleAccent1}</span>
              {titleMid}
              <span className="nelvyon-hero-v3__accent">{titleAccent2}</span>
              {titleMid2}
              <span className="nelvyon-hero-v3__accent">{titleAccent3}</span>
              {titleEnd}
            </h1>
            <p className="nelvyon-hero-v3__subtitle">{subtitle}</p>
            <div className="nelvyon-hero-v3__ctas">
              <a href="/contacto" className="mkt-btn nelvyon-btn-primary nelvyon-hero-v3__cta-primary">
                {ctaPrimary}
              </a>
              <Link href="/servicios" className="mkt-btn nelvyon-btn-outline nelvyon-btn-outline--light">
                {ctaSecondary}
              </Link>
            </div>
          </div>
        </Container>
      </SpotlightNew>
    </section>
  );
};
