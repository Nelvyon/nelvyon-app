import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { vozPremiumNelvyonDemoProject } from "@/templates/voz-premium/demo";
import { VozPremiumProjectTemplate } from "@/templates/voz-premium/VozPremiumProjectTemplate";
import { buildVozPremiumMetadata } from "@/templates/voz-premium/seo";

export const metadata = buildVozPremiumMetadata(vozPremiumNelvyonDemoProject.pageSeo);

export default function OsVozPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <VozPremiumProjectTemplate config={vozPremiumNelvyonDemoProject} showDeliveryPanel />
    </ProtectedLayout>
  );
}
