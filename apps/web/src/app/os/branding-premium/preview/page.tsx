import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { brandingPremiumNelvyonDemoProject } from "@/templates/branding-premium/demo";
import { BrandingPremiumProjectTemplate } from "@/templates/branding-premium/BrandingPremiumProjectTemplate";
import { buildBrandingPremiumMetadata } from "@/templates/branding-premium/seo";

export const metadata = buildBrandingPremiumMetadata(brandingPremiumNelvyonDemoProject.pageSeo);

export default function OsBrandingPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <BrandingPremiumProjectTemplate config={brandingPremiumNelvyonDemoProject} showDeliveryPanel />
    </ProtectedLayout>
  );
}
