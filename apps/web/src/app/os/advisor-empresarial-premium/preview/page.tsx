import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { advisorPremiumNelvyonDemoProject } from "@/templates/advisor-empresarial-premium/demo";
import { AdvisorEmpresarialPremiumProjectTemplate } from "@/templates/advisor-empresarial-premium/AdvisorEmpresarialPremiumProjectTemplate";
import { buildAdvisorPremiumMetadata } from "@/templates/advisor-empresarial-premium/seo";

export const metadata = buildAdvisorPremiumMetadata(advisorPremiumNelvyonDemoProject.pageSeo);

export default function OsAdvisorEmpresarialPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <AdvisorEmpresarialPremiumProjectTemplate config={advisorPremiumNelvyonDemoProject} showDeliveryPanel />
    </ProtectedLayout>
  );
}
