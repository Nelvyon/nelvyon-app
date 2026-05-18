import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { ecommercePremiumNelvyonDemoStore } from "@/templates/ecommerce-premium/demo";
import { EcommercePremiumPLP } from "@/templates/ecommerce-premium/EcommercePremiumPLP";
import { EcommercePremiumStoreShell } from "@/templates/ecommerce-premium/EcommercePremiumStoreShell";
import { buildEcommercePremiumMetadata } from "@/templates/ecommerce-premium/seo";

export const metadata = buildEcommercePremiumMetadata(ecommercePremiumNelvyonDemoStore.seo);

export default function OsEcommercePremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <EcommercePremiumStoreShell showDeliveryPanel store={ecommercePremiumNelvyonDemoStore}>
        <EcommercePremiumPLP store={ecommercePremiumNelvyonDemoStore} />
      </EcommercePremiumStoreShell>
    </ProtectedLayout>
  );
}
