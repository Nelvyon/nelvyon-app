import { AboutSection } from "@/components/pa/about";
import { BentoOne } from "@/components/pa/bento-one";
import { BentoTwo } from "@/components/pa/bento-two";
import { FAQ } from "@/components/pa/faq";
import { Hero } from "@/components/pa/hero";
import { Pricing } from "@/components/pa/pricing";
import { Projects } from "@/components/pa/projects";

export default function HomePage() {
  return (
    <>
      <Hero />
      <BentoOne />
      <Projects />
      <BentoTwo />
      <Pricing />
      <AboutSection />
      <FAQ />
    </>
  );
}
