import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { formacionCapacitacionPremiumNelvyonDemoProject } from "@/templates/formacion-capacitacion-premium/demo";
import { FormacionCapacitacionPremiumProjectTemplate } from "@/templates/formacion-capacitacion-premium/FormacionCapacitacionPremiumProjectTemplate";
import { buildFormacionPremiumMetadata } from "@/templates/formacion-capacitacion-premium/seo";

export const metadata = buildFormacionPremiumMetadata(formacionCapacitacionPremiumNelvyonDemoProject.pageSeo);

export default function OsFormacionCapacitacionPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <FormacionCapacitacionPremiumProjectTemplate config={formacionCapacitacionPremiumNelvyonDemoProject} showDeliveryPanel />
    </ProtectedLayout>
  );
}
