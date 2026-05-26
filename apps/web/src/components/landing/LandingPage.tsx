"use client";

import { AGENCY_FAQ } from "./agencyContent";
import { FaqSection } from "./FaqSection";
import { LandingFinalCta } from "./LandingFinalCta";
import { LandingFooter } from "./LandingFooter";
import { LandingHero } from "./LandingHero";
import { LandingHowItWorks } from "./LandingHowItWorks";
import { LandingLogosMarquee } from "./LandingLogosMarquee";
import { LandingNotificationBar } from "./LandingNotificationBar";
import { LandingServicesSection } from "./LandingServicesSection";
import { LandingStats } from "./LandingStats";
import { LandingSuccessCases } from "./LandingSuccessCases";
import { MarketingNavbar } from "./MarketingNavbar";
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
      <main className="bg-white">
        <div className="relative">
          <LandingHero />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-28"
            style={{ background: "linear-gradient(to bottom, transparent 0%, #ffffff 100%)" }}
          />
        </div>
        <LandingLogosMarquee />
        <LandingServicesSection />
        <LandingStats />
        <LandingHowItWorks />
        <LandingSuccessCases />
        <FaqSection dark={false} items={AGENCY_FAQ} />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
