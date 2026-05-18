import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { webPremiumNelvyonDemoConfig } from "@/templates/web-premium/demo";
import { buildWebPremiumMetadata } from "@/templates/web-premium/seo";
import { WebPremiumTemplate } from "@/templates/web-premium/WebPremiumTemplate";

/** OS-only preview of reusable Web Premium v1 shell (Flows 1–3). Not a client production site yet. */

export const metadata = buildWebPremiumMetadata(webPremiumNelvyonDemoConfig.seo);

export default function OsWebPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <WebPremiumTemplate config={webPremiumNelvyonDemoConfig} showDeliveryPanel />
    </ProtectedLayout>
  );
}
