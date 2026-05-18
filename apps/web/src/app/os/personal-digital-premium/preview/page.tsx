import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { personalDigitalPremiumNelvyonDemoProject } from "@/templates/personal-digital-premium/demo";
import { PersonalDigitalPremiumProjectTemplate } from "@/templates/personal-digital-premium/PersonalDigitalPremiumProjectTemplate";
import { buildPersonalDigitalPremiumMetadata } from "@/templates/personal-digital-premium/seo";

export const metadata = buildPersonalDigitalPremiumMetadata(personalDigitalPremiumNelvyonDemoProject.pageSeo);

export default function OsPersonalDigitalPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <PersonalDigitalPremiumProjectTemplate config={personalDigitalPremiumNelvyonDemoProject} showDeliveryPanel />
    </ProtectedLayout>
  );
}
