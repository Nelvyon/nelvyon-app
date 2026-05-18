import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { seoPremiumNelvyonDemoAudit } from "@/templates/seo-premium/demo";
import { SEOPremiumAuditTemplate } from "@/templates/seo-premium/SEOPremiumAuditTemplate";
import { buildSEOPremiumMetadata } from "@/templates/seo-premium/seo";

export const metadata = buildSEOPremiumMetadata(seoPremiumNelvyonDemoAudit.pageSeo);

export default function OsSeoPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <SEOPremiumAuditTemplate config={seoPremiumNelvyonDemoAudit} showDeliveryPanel />
    </ProtectedLayout>
  );
}
