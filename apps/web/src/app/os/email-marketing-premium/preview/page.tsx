import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { emailMarketingPremiumNelvyonDemoProject } from "@/templates/email-marketing-premium/demo";
import { EmailMarketingPremiumProjectTemplate } from "@/templates/email-marketing-premium/EmailMarketingPremiumProjectTemplate";
import { buildEmailMarketingPremiumMetadata } from "@/templates/email-marketing-premium/seo";

export const metadata = buildEmailMarketingPremiumMetadata(emailMarketingPremiumNelvyonDemoProject.pageSeo);

export default function OsEmailMarketingPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <EmailMarketingPremiumProjectTemplate config={emailMarketingPremiumNelvyonDemoProject} showDeliveryPanel />
    </ProtectedLayout>
  );
}
