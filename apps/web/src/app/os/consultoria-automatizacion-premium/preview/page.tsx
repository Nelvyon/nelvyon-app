import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { consultoriaAutomatizacionPremiumNelvyonDemoProject } from "@/templates/consultoria-automatizacion-premium/demo";
import { ConsultoriaAutomatizacionPremiumProjectTemplate } from "@/templates/consultoria-automatizacion-premium/ConsultoriaAutomatizacionPremiumProjectTemplate";
import { buildAutomatizacionPremiumMetadata } from "@/templates/consultoria-automatizacion-premium/seo";

export const metadata = buildAutomatizacionPremiumMetadata(consultoriaAutomatizacionPremiumNelvyonDemoProject.pageSeo);

export default function OsConsultoriaAutomatizacionPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <ConsultoriaAutomatizacionPremiumProjectTemplate config={consultoriaAutomatizacionPremiumNelvyonDemoProject} showDeliveryPanel />
    </ProtectedLayout>
  );
}
