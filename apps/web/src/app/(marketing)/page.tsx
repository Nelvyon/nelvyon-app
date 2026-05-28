import { Hero } from "@/components/agenforce/hero";
import { LogoCloud } from "@/components/agenforce/logo-cloud";
import { Features } from "@/components/agenforce/features";
import { Stats } from "@/components/agenforce/stats";
import { ComparisonTable } from "@/components/agenforce/comparison-table";
import { Testimonials } from "@/components/agenforce/testimonials";
import { Pricing } from "@/components/agenforce/pricing";
import { Faqs } from "@/components/agenforce/faqs";
import { CtaFinal } from "@/components/agenforce/cta-final";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Stats />
      <LogoCloud />
      <Features />
      <ComparisonTable />
      <Testimonials />
      <Pricing />
      <Faqs />
      <CtaFinal />
    </main>
  );
}
