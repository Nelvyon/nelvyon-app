import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { adsPremiumNelvyonDemoCampaign } from "@/templates/ads-premium/demo";
import { AdsPremiumCampaignTemplate } from "@/templates/ads-premium/AdsPremiumCampaignTemplate";
import { buildAdsPremiumMetadata } from "@/templates/ads-premium/seo";

export const metadata = buildAdsPremiumMetadata(adsPremiumNelvyonDemoCampaign.pageSeo);

export default function OsAdsPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <AdsPremiumCampaignTemplate config={adsPremiumNelvyonDemoCampaign} showDeliveryPanel />
    </ProtectedLayout>
  );
}
