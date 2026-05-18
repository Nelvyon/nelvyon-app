import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { fotografiaProductoPremiumNelvyonDemoProject } from "@/templates/fotografia-producto-premium/demo";
import { FotografiaProductoPremiumProjectTemplate } from "@/templates/fotografia-producto-premium/FotografiaProductoPremiumProjectTemplate";
import { buildFotografiaPremiumMetadata } from "@/templates/fotografia-producto-premium/seo";

export const metadata = buildFotografiaPremiumMetadata(fotografiaProductoPremiumNelvyonDemoProject.pageSeo);

export default function OsFotografiaProductoPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <FotografiaProductoPremiumProjectTemplate config={fotografiaProductoPremiumNelvyonDemoProject} showDeliveryPanel />
    </ProtectedLayout>
  );
}
