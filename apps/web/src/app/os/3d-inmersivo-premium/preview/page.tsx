import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { inmersivo3dPremiumNelvyonDemoProject } from "@/templates/3d-inmersivo-premium/demo";
import { Inmersivo3dPremiumProjectTemplate } from "@/templates/3d-inmersivo-premium/Inmersivo3dPremiumProjectTemplate";
import { buildInmersivoPremiumMetadata } from "@/templates/3d-inmersivo-premium/seo";

export const metadata = buildInmersivoPremiumMetadata(inmersivo3dPremiumNelvyonDemoProject.pageSeo);

export default function Os3dInmersivoPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <Inmersivo3dPremiumProjectTemplate config={inmersivo3dPremiumNelvyonDemoProject} showDeliveryPanel />
    </ProtectedLayout>
  );
}
