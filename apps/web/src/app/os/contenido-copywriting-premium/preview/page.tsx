import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { contenidoCopywritingPremiumNelvyonDemoProject } from "@/templates/contenido-copywriting-premium/demo";
import { ContenidoCopywritingPremiumProjectTemplate } from "@/templates/contenido-copywriting-premium/ContenidoCopywritingPremiumProjectTemplate";
import { buildContenidoPremiumMetadata } from "@/templates/contenido-copywriting-premium/seo";

export const metadata = buildContenidoPremiumMetadata(contenidoCopywritingPremiumNelvyonDemoProject.pageSeo);

export default function OsContenidoCopywritingPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <ContenidoCopywritingPremiumProjectTemplate config={contenidoCopywritingPremiumNelvyonDemoProject} showDeliveryPanel />
    </ProtectedLayout>
  );
}
