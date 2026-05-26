"use client";

import { AGENCY_FAQ } from "./agencyContent";
import { FaqSection } from "./FaqSection";
import { LandingFinalCta } from "./LandingFinalCta";
import { LandingFooter } from "./LandingFooter";
import { LandingHero } from "./LandingHero";
import { LandingHowItWorks } from "./LandingHowItWorks";
import { LandingLogosMarquee } from "./LandingLogosMarquee";
import { LandingNotificationBar } from "./LandingNotificationBar";
import { LandingStats } from "./LandingStats";
import { LandingComingSoonCases } from "./LandingComingSoonCases";
import { MarketingNavbar } from "./MarketingNavbar";
import { ServicesGrid } from "./ServicesGrid";
import { BRAND } from "./shared";

export function LandingPage() {
  return (
    <div
      className="min-h-screen overflow-x-hidden antialiased"
      style={{
        backgroundColor: BRAND.white,
        color: BRAND.textOnWhite,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <LandingNotificationBar />
      <MarketingNavbar active="/" />
      <main>
        <LandingHero />
        <LandingLogosMarquee />
        <ServicesGrid />
        <LandingStats />
        <LandingHowItWorks />
        <LandingComingSoonCases />
        <FaqSection dark={false} items={AGENCY_FAQ} />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
