import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { reputacionOrmPremiumNelvyonDemoProject } from "@/templates/reputacion-orm-premium/demo";
import { ReputacionOrmPremiumProjectTemplate } from "@/templates/reputacion-orm-premium/ReputacionOrmPremiumProjectTemplate";
import { buildOrmPremiumMetadata } from "@/templates/reputacion-orm-premium/seo";

export const metadata = buildOrmPremiumMetadata(reputacionOrmPremiumNelvyonDemoProject.pageSeo);

export default function OsReputacionOrmPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <ReputacionOrmPremiumProjectTemplate config={reputacionOrmPremiumNelvyonDemoProject} showDeliveryPanel />
    </ProtectedLayout>
  );
}
