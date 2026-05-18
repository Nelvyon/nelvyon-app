import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { disenoGraficoPremiumNelvyonDemoProject } from "@/templates/diseno-grafico-premium/demo";
import { DisenoGraficoPremiumProjectTemplate } from "@/templates/diseno-grafico-premium/DisenoGraficoPremiumProjectTemplate";
import { buildDisenoPremiumMetadata } from "@/templates/diseno-grafico-premium/seo";

export const metadata = buildDisenoPremiumMetadata(disenoGraficoPremiumNelvyonDemoProject.pageSeo);

export default function OsDisenoGraficoPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <DisenoGraficoPremiumProjectTemplate config={disenoGraficoPremiumNelvyonDemoProject} showDeliveryPanel />
    </ProtectedLayout>
  );
}
