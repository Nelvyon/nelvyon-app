import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canalesPremiumNelvyonDemoProject } from "@/templates/canales-comunicaciones-premium/demo";
import { CanalesComunicacionesPremiumProjectTemplate } from "@/templates/canales-comunicaciones-premium/CanalesComunicacionesPremiumProjectTemplate";
import { buildCanalesPremiumMetadata } from "@/templates/canales-comunicaciones-premium/seo";

export const metadata = buildCanalesPremiumMetadata(canalesPremiumNelvyonDemoProject.pageSeo);

export default function OsCanalesComunicacionesPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <CanalesComunicacionesPremiumProjectTemplate config={canalesPremiumNelvyonDemoProject} showDeliveryPanel />
    </ProtectedLayout>
  );
}
