import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { webPremiumNelvyonDemoConfig } from "@/templates/web-premium/demo";
import { buildWebPremiumMetadata } from "@/templates/web-premium/seo";
import { WebPremiumTemplate } from "@/templates/web-premium/WebPremiumTemplate";

/** OS Landing Premium — reusable high-conversion shell (Flow 1). */

export const metadata = buildWebPremiumMetadata({
  ...webPremiumNelvyonDemoConfig.seo,
  title: "Landing Premium · Preview OS | Nelvyon",
});

export default function OsLandingPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <WebPremiumTemplate config={webPremiumNelvyonDemoConfig} showDeliveryPanel />
    </ProtectedLayout>
  );
}
