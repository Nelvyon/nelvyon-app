import { Hero } from "@/components/agenforce/hero";
import { QueEsNelvyon } from "@/components/agenforce/que-es-nelvyon";
import { Problema } from "@/components/agenforce/problema";
import { ComoFunciona } from "@/components/agenforce/como-funciona";
import { EcosistemaNelvyon } from "@/components/agenforce/ecosistema-nelvyon";
import { PlataformaOs } from "@/components/agenforce/plataforma-os";
import { ProductShowcase } from "@/components/agenforce/product-showcase";
import { ModulosHome } from "@/components/agenforce/modulos-home";
import { Features } from "@/components/agenforce/features";
import { Diferenciadores } from "@/components/agenforce/diferenciadores";
import { Testimonials } from "@/components/agenforce/testimonials";
import { Stats } from "@/components/agenforce/stats";
import { Faqs } from "@/components/agenforce/faqs";
import { CtaFinal } from "@/components/agenforce/cta-final";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <QueEsNelvyon />
      <PlataformaOs />
      <EcosistemaNelvyon />
      <Problema />
      <ComoFunciona />
      <ProductShowcase />
      <ModulosHome />
      <Features />
      <Diferenciadores />
      <Testimonials />
      <Stats />
      <Faqs />
      <CtaFinal />
    </main>
  );
}
