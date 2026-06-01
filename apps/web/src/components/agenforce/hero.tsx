import Image from "next/image";
import Link from "next/link";

import { SpotlightNew } from "@/components/premium/spotlight-new";

import { Container } from "./container";
import { HOME_COPY } from "./home-copy";

const HERO_VISUAL_SRC = "/images/nelvyon-hero-visual.png";

export const Hero = () => {
  const { title, subtitle, ctaPrimary, ctaSecondary } = HOME_COPY.hero;

  return (
    <section className="nelvyon-hero-def" aria-labelledby="home-hero-title">
      <SpotlightNew className="nelvyon-hero-def__spotlight">
        <Container className="nelvyon-hero-def__container">
          <div className="nelvyon-hero-def__grid">
            <div className="nelvyon-hero-def__copy">
              <h1 id="home-hero-title" className="nelvyon-hero-def__title">
                {title}
              </h1>
              <p className="nelvyon-hero-def__subtitle">{subtitle}</p>
              <div className="nelvyon-hero-def__ctas">
                <a href="/contacto" className="mkt-btn nelvyon-btn-primary nelvyon-hero-def__cta-primary">
                  {ctaPrimary}
                </a>
                <Link href="/servicios" className="mkt-btn nelvyon-btn-outline nelvyon-btn-outline--light">
                  {ctaSecondary}
                </Link>
              </div>
            </div>

            <div className="nelvyon-hero-def__visual" aria-hidden>
              <div className="nelvyon-hero-def__visual-glow" />
              <div className="nelvyon-hero-def__visual-frame">
                <Image
                  src={HERO_VISUAL_SRC}
                  alt=""
                  width={720}
                  height={640}
                  priority
                  className="nelvyon-hero-def__img"
                  sizes="(max-width: 899px) 100vw, 42vw"
                />
              </div>
            </div>
          </div>
        </Container>
      </SpotlightNew>
    </section>
  );
};
