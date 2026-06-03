import { BentoOne } from "@/components/pa/bento-one";
import { FAQ } from "@/components/pa/faq";
import { Hero } from "@/components/pa/hero";
import { Pricing } from "@/components/pa/pricing";
import { HomeDifferentiationSection } from "@/components/pa/marketing/home-differentiation-section";
import { HomeSaasSection } from "@/components/pa/marketing/home-saas-section";
import { HomeSystemSection } from "@/components/pa/marketing/home-system-section";

export default function HomePage() {
  return (
    <>
      <Hero />
      <HomeSystemSection />
      <BentoOne />
      <HomeSaasSection />
      <HomeDifferentiationSection />
      <Pricing />
      <FAQ />
    </>
  );
}
