"use client";

import { AGENCY_FAQ } from "./agencyContent";
import { FaqSection } from "./FaqSection";
import { LandingAgencyServices } from "./LandingAgencyServices";
import { LandingFinalCta } from "./LandingFinalCta";
import { LandingFooter } from "./LandingFooter";
import { LandingHero } from "./LandingHero";
import { LandingHowItWorks } from "./LandingHowItWorks";
import { LandingLogosMarquee } from "./LandingLogosMarquee";
import { LandingMission } from "./LandingMission";
import { LandingNotificationBar } from "./LandingNotificationBar";
import { LandingStats } from "./LandingStats";
import { LandingTestimonials } from "./LandingTestimonials";
import { MarketingNavbar } from "./MarketingNavbar";
import { BRAND } from "./shared";

export function LandingPage() {
  return (
    <div
      className="min-h-screen overflow-x-hidden antialiased"
      style={{
        backgroundColor: BRAND.bg,
        color: BRAND.textMuted,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <LandingNotificationBar />
      <MarketingNavbar active="/" />
      <main>
        <LandingHero />
        <LandingLogosMarquee />
        <LandingStats />
        <LandingAgencyServices />
        <LandingMission />
        <LandingHowItWorks />
        <LandingTestimonials />
        <FaqSection items={AGENCY_FAQ} />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
