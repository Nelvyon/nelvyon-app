import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { mantenimientoWebPremiumNelvyonDemoProject } from "@/templates/mantenimiento-web-premium/demo";
import { MantenimientoWebPremiumProjectTemplate } from "@/templates/mantenimiento-web-premium/MantenimientoWebPremiumProjectTemplate";
import { buildMantenimientoPremiumMetadata } from "@/templates/mantenimiento-web-premium/seo";

export const metadata = buildMantenimientoPremiumMetadata(mantenimientoWebPremiumNelvyonDemoProject.pageSeo);

export default function OsMantenimientoWebPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <MantenimientoWebPremiumProjectTemplate config={mantenimientoWebPremiumNelvyonDemoProject} showDeliveryPanel />
    </ProtectedLayout>
  );
}
