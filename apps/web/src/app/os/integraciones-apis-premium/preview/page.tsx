import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { integracionesApisPremiumNelvyonDemoProject } from "@/templates/integraciones-apis-premium/demo";
import { IntegracionesApisPremiumProjectTemplate } from "@/templates/integraciones-apis-premium/IntegracionesApisPremiumProjectTemplate";
import { buildIntegracionPremiumMetadata } from "@/templates/integraciones-apis-premium/seo";

export const metadata = buildIntegracionPremiumMetadata(integracionesApisPremiumNelvyonDemoProject.pageSeo);

export default function OsIntegracionesApisPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <IntegracionesApisPremiumProjectTemplate config={integracionesApisPremiumNelvyonDemoProject} showDeliveryPanel />
    </ProtectedLayout>
  );
}
