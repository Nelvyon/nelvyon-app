import { BentoOne } from "@/components/pa/bento-one";
import { BentoTwo } from "@/components/pa/bento-two";
import { FAQ } from "@/components/pa/faq";
import { Hero } from "@/components/pa/hero";
import { Pricing } from "@/components/pa/pricing";
import { HomeDifferentiationSection } from "@/components/pa/marketing/home-differentiation-section";
import { HomeSystemSection } from "@/components/pa/marketing/home-system-section";

export default function HomePage() {
  return (
    <>
      <Hero />
      <HomeSystemSection />
      <BentoOne />
      <HomeDifferentiationSection />
      <BentoTwo />
      <Pricing />
      <FAQ />
    </>
  );
}
