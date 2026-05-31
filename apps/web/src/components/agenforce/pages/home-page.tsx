import { CasosDeUso } from "../casos-de-uso";
import { CtaFinal } from "../cta-final";
import { Hero } from "../hero";
import { HomeFaqs } from "../home-faqs";
import { HomePricingTeaser } from "../home-pricing-teaser";
import { HomeServicios } from "../home-servicios";
import { HomeTrustStrip } from "../home-trust-strip";
import { IntegrationsHub } from "../integrations-hub";
import { ProductTour } from "../product-tour";
import { QueEsNelvyon } from "../que-es-nelvyon";

export function AgenforceHomePage() {
  return (
    <main className="nelvyon-home nelvyon-home--v3">
      <Hero />
      <QueEsNelvyon />
      <ProductTour />
      <IntegrationsHub />
      <HomeServicios />
      <HomeTrustStrip />
      <CasosDeUso />
      <HomePricingTeaser />
      <HomeFaqs />
      <CtaFinal
        title="Construye una operación digital con más control"
        subtitle="Centraliza marketing, ventas, CRM, comunicación y reporting con NELVYON."
        primaryLabel="Solicitar información"
      />
    </main>
  );
}
