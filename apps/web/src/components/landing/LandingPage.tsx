"use client";

import { AGENCY_FAQ } from "./agencyContent";
import { AgencyComparisonTable } from "./AgencyComparisonTable";
import { FaqSection } from "./FaqSection";
import { LandingFinalCta } from "./LandingFinalCta";
import { LandingFooter } from "./LandingFooter";
import { LandingHero } from "./LandingHero";
import { LandingLogosMarquee } from "./LandingLogosMarquee";
import { LandingServicesGrid } from "./LandingServicesGrid";
import { LandingNotificationBar } from "./LandingNotificationBar";
import { LandingStats } from "./LandingStats";
import { LandingTabsSection } from "./LandingTabsSection";
import { LandingTestimonials } from "./LandingTestimonials";
import { MarketingNavbar } from "./MarketingNavbar";
import { StickyCtaBar } from "./StickyCtaBar";
import { WhyNelvyon } from "./WhyNelvyon";

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden antialiased" style={{ backgroundColor: "#ffffff" }}>
      <StickyCtaBar />
      <LandingNotificationBar />
      <MarketingNavbar active="/" />
      <main className="relative z-0">
        <LandingHero />
        <LandingLogosMarquee />
        <LandingStats />
        <WhyNelvyon />
        <LandingTabsSection />
        <AgencyComparisonTable />
        <LandingTestimonials />
        <LandingServicesGrid />
        <FaqSection dark items={AGENCY_FAQ} />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
