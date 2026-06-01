import { LampEffect } from "@/components/premium/lamp-effect";

import { CtaFinal } from "../cta-final";
import { Hero } from "../hero";
import {
  HomeComoTrabaja,
  HomeParaQuien,
  HomePorQue,
  HomeQueHace,
} from "../home-editorial";
import { HOME_COPY } from "../home-copy";
import { HomeIntegrationsMarquee } from "../home-integrations-marquee";
import { HomeQueEs } from "../home-que-es";
import { HomeSaasTeaser } from "../home-saas-teaser";
import { HomeServicios } from "../home-servicios";
import { HomeWorldMap } from "../home-world-map";

export function AgenforceHomePage() {
  return (
    <main className="nelvyon-home nelvyon-home--v3">
      <Hero />
      <HomeQueEs />
      <HomeQueHace />
      <HomeParaQuien />
      <HomeComoTrabaja />
      <HomePorQue />
      <HomeWorldMap />
      <HomeServicios />
      <HomeSaasTeaser />
      <HomeIntegrationsMarquee />
      <LampEffect className="nelvyon-home-cta-scene">
        <CtaFinal
          title={HOME_COPY.ctaFinal.title}
          primaryLabel={HOME_COPY.ctaFinal.cta}
          showSecondary={false}
        />
      </LampEffect>
    </main>
  );
}
