import { BentoOne } from "@/components/pa/bento-one";
import { BentoTwo } from "@/components/pa/bento-two";
import { FAQ } from "@/components/pa/faq";
import { Hero } from "@/components/pa/hero";
import { Pricing } from "@/components/pa/pricing";

export default function HomePage() {
  return (
    <>
      <Hero />
      <BentoOne />
      <BentoTwo />
      <Pricing />
      <FAQ />
    </>
  );
}
