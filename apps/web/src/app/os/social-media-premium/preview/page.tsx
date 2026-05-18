import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { socialMediaPremiumNelvyonDemoProject } from "@/templates/social-media-premium/demo";
import { SocialMediaPremiumProjectTemplate } from "@/templates/social-media-premium/SocialMediaPremiumProjectTemplate";
import { buildSocialMediaPremiumMetadata } from "@/templates/social-media-premium/seo";

export const metadata = buildSocialMediaPremiumMetadata(socialMediaPremiumNelvyonDemoProject.pageSeo);

export default function OsSocialMediaPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <SocialMediaPremiumProjectTemplate config={socialMediaPremiumNelvyonDemoProject} showDeliveryPanel />
    </ProtectedLayout>
  );
}
