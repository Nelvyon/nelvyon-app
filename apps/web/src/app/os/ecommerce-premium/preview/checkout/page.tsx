import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { ecommercePremiumNelvyonDemoStore } from "@/templates/ecommerce-premium/demo";
import { EcommercePremiumCheckout } from "@/templates/ecommerce-premium/EcommercePremiumCheckout";
import { EcommercePremiumStoreShell } from "@/templates/ecommerce-premium/EcommercePremiumStoreShell";
import { buildEcommercePremiumMetadata } from "@/templates/ecommerce-premium/seo";

export const metadata = buildEcommercePremiumMetadata(ecommercePremiumNelvyonDemoStore.checkout.seo);

export default function OsEcommercePremiumCheckoutPage() {
  return (
    <ProtectedLayout module="os">
      <EcommercePremiumStoreShell store={ecommercePremiumNelvyonDemoStore}>
        <EcommercePremiumCheckout store={ecommercePremiumNelvyonDemoStore} />
      </EcommercePremiumStoreShell>
    </ProtectedLayout>
  );
}
