import { getSEO } from "@/lib/seo";
import { AboutSection } from "@/components/about";
import { BentoOne } from "@/components/bento-one";
import { BentoTwo } from "@/components/bento-two";
import { Comparison } from "@/components/comparison";
import { FAQ } from "@/components/faq";
import { Feedbacks } from "@/components/feedbacks";
import { Hero } from "@/components/hero";
import { LogoCloud } from "@/components/logo-cloud";
import { Pricing } from "@/components/pricing";
import { Projects } from "@/components/projects";
import { Testimonials } from "@/components/testimonials";

export const metadata = getSEO({
  title: "Design and Development Agency",
  path: "/",
});

export default function Home() {
  return (
    <section className="flex max-w-screen overflow-x-hidden flex-col items-center justify-center">
      <Hero />
      <LogoCloud />
      <BentoOne />
      <Projects />
      <Testimonials />
      <BentoTwo />
      <Comparison />
      <Pricing />
      <AboutSection />
      <Feedbacks />
      <FAQ />
    </section>
  );
}
