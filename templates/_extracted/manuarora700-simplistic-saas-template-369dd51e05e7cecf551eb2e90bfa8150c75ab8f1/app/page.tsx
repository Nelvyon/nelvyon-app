import { CTA } from "@/components/cta";
import { FAQs } from "@/components/faqs";
import { FeaturesOne } from "@/components/features-one";
import { FeaturesTwo } from "@/components/features-two";
import Hero from "@/components/hero";
import { LogoCloud } from "@/components/logo-cloud";
import { Pricing } from "@/components/pricing";
import { Testimonials } from "@/components/testimonials";

export default function Home() {
  return (
    <main className="">
      <Hero />
      <LogoCloud />
      <FeaturesOne />
      <Testimonials />
      <FeaturesTwo />
      <Pricing />
      <FAQs />
      <CTA />
    </main>
  );
}
