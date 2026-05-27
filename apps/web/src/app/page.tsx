import { FAQs } from "@/components/agenforce/faqs";
import { Features } from "@/components/agenforce/features";
import { FeaturesSecondary } from "@/components/agenforce/features-secondary";
import { FeaturesTertiary } from "@/components/agenforce/features-tertiary";
import { Hero } from "@/components/agenforce/hero";
import { LogoCloud } from "@/components/agenforce/logo-cloud";
import { MarketingLayout } from "@/components/agenforce/marketing-layout";
import { Outcomes } from "@/components/agenforce/outcomes";
import { Pricing } from "@/components/agenforce/pricing";
import { Speed } from "@/components/agenforce/speed";

export default function HomePage() {
  return (
    <MarketingLayout>
      <div className="min-h-screen">
        <Hero />
        <LogoCloud />
        <Features />
        <Speed />
        <FeaturesSecondary />
        <Outcomes />
        <FeaturesTertiary />
        <Pricing />
        <FAQs />
      </div>
    </MarketingLayout>
  );
}
