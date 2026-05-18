import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { influencerMarketingPremiumNelvyonDemoProject } from "@/templates/influencer-marketing-premium/demo";
import { InfluencerMarketingPremiumProjectTemplate } from "@/templates/influencer-marketing-premium/InfluencerMarketingPremiumProjectTemplate";
import { buildInfluencerPremiumMetadata } from "@/templates/influencer-marketing-premium/seo";

export const metadata = buildInfluencerPremiumMetadata(influencerMarketingPremiumNelvyonDemoProject.pageSeo);

export default function OsInfluencerMarketingPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <InfluencerMarketingPremiumProjectTemplate config={influencerMarketingPremiumNelvyonDemoProject} showDeliveryPanel />
    </ProtectedLayout>
  );
}
