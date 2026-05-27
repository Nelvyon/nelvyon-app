import { LandingHero } from './LandingHero'
import { LandingStats } from './LandingStats'
import { LandingLogosMarquee } from './LandingLogosMarquee'
import { AgencyComparisonTable } from './AgencyComparisonTable'
import { LandingServicesGrid } from './LandingServicesGrid'
import { WhyNelvyon } from './WhyNelvyon'
import { StickyCtaBar } from './StickyCtaBar'
import { MarketingNavbar } from './MarketingNavbar'
export function LandingPage() {
  return (
    <>
      <MarketingNavbar active="/" />
      <LandingHero />
      <LandingStats />
      <LandingLogosMarquee />
      <LandingServicesGrid />
      <AgencyComparisonTable />
      <WhyNelvyon />
      <StickyCtaBar />
    </>
  )
}
