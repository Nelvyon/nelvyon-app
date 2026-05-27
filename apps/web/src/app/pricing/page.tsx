import { Container } from "@/components/agenforce/container";
import { FAQs } from "@/components/agenforce/faqs";
import { Heading } from "@/components/agenforce/heading";
import { MarketingLayout } from "@/components/agenforce/marketing-layout";
import { Pricing } from "@/components/agenforce/pricing";
import { Subheading } from "@/components/agenforce/subheading";

export default function PricingPage() {
  return (
    <MarketingLayout>
      <div className="min-h-screen">
        <section className="py-16 md:py-24">
          <Container className="text-center">
            <Subheading className="mx-auto">Precios</Subheading>
            <Heading as="h1" className="mt-4">
              Precios claros. Sin sorpresas.
            </Heading>
            <Subheading className="mt-4 mx-auto max-w-2xl">
              Elige el plan que se adapta a tu agencia. Todos incluyen 14 días gratis sin tarjeta.
            </Subheading>
          </Container>
        </section>
        <Pricing />
        <FAQs />
      </div>
    </MarketingLayout>
  );
}
