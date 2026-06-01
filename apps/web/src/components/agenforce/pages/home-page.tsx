import { LampEffect } from "@/components/premium/lamp-effect";

import { CtaFinal } from "../cta-final";
import { Hero } from "../hero";
import { HomeConnectedOperation } from "../home-connected-operation";
import { HomeFaqs } from "../home-faqs";
import { HomeIntegrationsMarquee } from "../home-integrations-marquee";
import { HomeMetodologia } from "../home-metodologia";
import { HomeOfferSplit } from "../home-offer-split";
import { HomeParaQuien } from "../home-para-quien";
import { HomePricingDual } from "../home-pricing-dual";
import { HomeProblemasResuelve } from "../home-problemas-resuelve";
import { HomeTrustStrip } from "../home-trust-strip";

export function AgenforceHomePage() {
  return (
    <main className="nelvyon-home nelvyon-home--v5 nelvyon-home--launch nelvyon-home--enterprise">
      <Hero />
      <HomeIntegrationsMarquee />
      <HomeParaQuien />
      <HomeProblemasResuelve />
      <HomeOfferSplit />
      <HomeConnectedOperation />
      <HomeMetodologia />
      <HomeTrustStrip />
      <HomePricingDual />
      <HomeFaqs />
      <LampEffect>
        <CtaFinal
          title="¿Hablamos de tu operación?"
          subtitle="Servicios profesionales y plataforma SaaS. Sin promesas vacías."
          primaryLabel="Solicitar información"
          secondaryLabel="Ver servicios"
          secondaryHref="/servicios"
        />
      </LampEffect>
    </main>
  );
}
