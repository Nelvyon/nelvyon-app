"use client";

import { AGENCY_FAQ } from "./agencyContent";
import { AgencyComparisonTable } from "./AgencyComparisonTable";
import { FaqSection } from "./FaqSection";
import { LandingFinalCta } from "./LandingFinalCta";
import { LandingFooter } from "./LandingFooter";
import { LandingHero } from "./LandingHero";
import { LandingLogosMarquee } from "./LandingLogosMarquee";
import { LandingNotificationBar } from "./LandingNotificationBar";
import { LandingStats } from "./LandingStats";
import { LandingTabsSection } from "./LandingTabsSection";
import { LandingTestimonials } from "./LandingTestimonials";
import { MarketingNavbar } from "./MarketingNavbar";
import { ServicesMindMap } from "./ServicesMindMap";
import { BRAND } from "./shared";

export function LandingPage() {
  return (
    <div
      className="min-h-screen overflow-x-hidden antialiased"
      style={{
        backgroundColor: BRAND.bg,
        color: BRAND.textPrimary,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <LandingNotificationBar />
      <MarketingNavbar active="/" />
      <main style={{ backgroundColor: BRAND.bg }}>
        <div className="relative">
          <LandingHero />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-[120px]"
            style={{ background: "linear-gradient(to bottom, transparent 0%, #050816 100%)" }}
          />
        </div>
        <LandingLogosMarquee />
        <LandingStats />
        <LandingTabsSection />
        <AgencyComparisonTable />
        <LandingTestimonials />
        <ServicesMindMap />
        <FaqSection dark items={AGENCY_FAQ} />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
