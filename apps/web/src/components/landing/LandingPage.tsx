"use client";

import { LandingComparison } from "./LandingComparison";
import { LandingFinalCta } from "./LandingFinalCta";
import { LandingFooter } from "./LandingFooter";
import { LandingHero } from "./LandingHero";
import { LandingHowItWorks } from "./LandingHowItWorks";
import { LandingIntegrations } from "./LandingIntegrations";
import { LandingMission } from "./LandingMission";
import { LandingNavbar } from "./LandingNavbar";
import { LandingNotificationBar } from "./LandingNotificationBar";
import { LandingPricing } from "./LandingPricing";
import { LandingServices } from "./LandingServices";
import { LandingStats } from "./LandingStats";
import { LandingTabsSection } from "./LandingTabsSection";
import { LandingTestimonials } from "./LandingTestimonials";
import { COLORS } from "./constants";

export function LandingPage() {
  return (
    <div
      className="min-h-screen overflow-x-hidden text-white antialiased"
      style={{
        backgroundColor: COLORS.bg,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <LandingNotificationBar />
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingStats />
        <LandingTabsSection />
        <LandingMission />
        <LandingComparison />
        <LandingServices />
        <LandingHowItWorks />
        <LandingTestimonials />
        <LandingPricing />
        <LandingIntegrations />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
