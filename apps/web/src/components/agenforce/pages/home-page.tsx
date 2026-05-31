import { CasosDeUso } from "../casos-de-uso";
import { CtaFinal } from "../cta-final";
import { Hero } from "../hero";
import { HomePricingTeaser } from "../home-pricing-teaser";
import { HomeTrustStrip } from "../home-trust-strip";
import { IntegrationsHub } from "../integrations-hub";
import { ProductShowcase } from "../product-showcase";
import { QueEsNelvyon } from "../que-es-nelvyon";

export function AgenforceHomePage() {
  return (
    <main className="nelvyon-home">
      <Hero />
      <IntegrationsHub />
      <QueEsNelvyon />
      <ProductShowcase />
      <HomeTrustStrip />
      <HomePricingTeaser />
      <CasosDeUso />
      <CtaFinal
        title="Construye una operación digital con más control"
        subtitle="Centraliza marketing, ventas, CRM, comunicación y reporting con NELVYON."
        primaryLabel="Solicitar información"
      />
    </main>
  );
}
