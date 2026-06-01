import { LampEffect } from "@/components/premium/lamp-effect";

import { CtaFinal } from "../cta-final";
import { Hero } from "../hero";
import { HOME_COPY } from "../home-copy";
import { HomeIntegrationsMarquee } from "../home-integrations-marquee";
import { HomeMisionVision } from "../home-mision-vision";
import { HomeQueEs } from "../home-que-es";
import { HomeSaasTeaser } from "../home-saas-teaser";
import { HomeServicios } from "../home-servicios";
import { HomeWorldMap } from "../home-world-map";

export function AgenforceHomePage() {
  return (
    <main className="nelvyon-home nelvyon-home--definitive">
      <Hero />
      <HomeQueEs />
      <HomeMisionVision />
      <HomeWorldMap />
      <HomeServicios />
      <HomeSaasTeaser />
      <HomeIntegrationsMarquee />
      <LampEffect>
        <CtaFinal
          title={HOME_COPY.ctaFinal.title}
          primaryLabel={HOME_COPY.ctaFinal.cta}
          showSecondary={false}
        />
      </LampEffect>
    </main>
  );
}
