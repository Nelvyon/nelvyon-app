import { HomeComparison } from "@/components/nelvyon-marketing/home/comparison";
import { HomeCtaFinal } from "@/components/nelvyon-marketing/home/cta-final";
import { HomeFeaturesBento } from "@/components/nelvyon-marketing/home/features-bento";
import { HomeHero } from "@/components/nelvyon-marketing/home/hero";
import { HomeLogoMarquee } from "@/components/nelvyon-marketing/home/logo-marquee";
import { HomePricingSection } from "@/components/nelvyon-marketing/home/pricing-section";
import { HomeStatsSection } from "@/components/nelvyon-marketing/home/stats-section";
import { HomeTestimonials } from "@/components/nelvyon-marketing/home/testimonials";
import { NelvyonMarketingShell } from "@/components/nelvyon-marketing/marketing-shell";

export default function HomePage() {
  return (
    <NelvyonMarketingShell>
      <HomeHero />
      <HomeLogoMarquee />
      <HomeStatsSection />
      <HomeFeaturesBento />
      <HomeComparison />
      <HomePricingSection />
      <HomeTestimonials />
      <HomeCtaFinal />
    </NelvyonMarketingShell>
  );
}
