import { CtaFinal } from "../cta-final";
import { Hero } from "../hero";
import { HomeBrandBand } from "../home-brand-band";
import { HomeFaqs } from "../home-faqs";
import { HomeIntegrationsCompact } from "../home-integrations-compact";
import { HomeMetodologia } from "../home-metodologia";
import { HomeParaQuien } from "../home-para-quien";
import { HomePricingDual } from "../home-pricing-dual";
import { HomeProblemasResuelve } from "../home-problemas-resuelve";
import { HomeQueHaceNelvyon } from "../home-que-hace-nelvyon";
import { HomeSaasCompact } from "../home-saas-compact";
import { HomeServicios } from "../home-servicios";
import { HomeTrustStrip } from "../home-trust-strip";

export function AgenforceHomePage() {
  return (
    <main className="nelvyon-home nelvyon-home--v5 nelvyon-home--launch">
      <Hero />
      <HomeBrandBand />
      <HomeParaQuien />
      <HomeProblemasResuelve />
      <HomeQueHaceNelvyon />
      <HomeServicios />
      <HomeMetodologia />
      <HomeSaasCompact />
      <HomeIntegrationsCompact />
      <HomeTrustStrip />
      <HomePricingDual />
      <HomeFaqs />
      <CtaFinal
        title="¿Hablamos de tu operación?"
        subtitle="Servicios profesionales y plataforma SaaS. Sin promesas vacías."
        primaryLabel="Solicitar información"
        secondaryLabel="Ver servicios"
        secondaryHref="/servicios"
      />
    </main>
  );
}
