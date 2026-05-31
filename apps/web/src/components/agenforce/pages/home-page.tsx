import { CasosDeUso } from "../casos-de-uso";
import { CtaFinal } from "../cta-final";
import { Hero } from "../hero";
import { HomeFaqs } from "../home-faqs";
import { HomeIntegrationsCompact } from "../home-integrations-compact";
import { HomeMetodologia } from "../home-metodologia";
import { HomePricingDual } from "../home-pricing-dual";
import { HomeSaasCompact } from "../home-saas-compact";
import { HomeServicios } from "../home-servicios";
import { HomeTrustStrip } from "../home-trust-strip";
import { QueEsNelvyon } from "../que-es-nelvyon";

export function AgenforceHomePage() {
  return (
    <main className="nelvyon-home nelvyon-home--v4">
      <Hero />
      <HomeServicios />
      <HomeMetodologia />
      <QueEsNelvyon />
      <HomeSaasCompact />
      <HomeIntegrationsCompact />
      <HomeTrustStrip />
      <CasosDeUso />
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
