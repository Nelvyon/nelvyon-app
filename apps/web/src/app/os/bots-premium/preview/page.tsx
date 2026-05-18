import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { botsPremiumNelvyonDemoProject } from "@/templates/bots-premium/demo";
import { BotsPremiumProjectTemplate } from "@/templates/bots-premium/BotsPremiumProjectTemplate";
import { buildBotsPremiumMetadata } from "@/templates/bots-premium/seo";

export const metadata = buildBotsPremiumMetadata(botsPremiumNelvyonDemoProject.pageSeo);

export default function OsBotsPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <BotsPremiumProjectTemplate config={botsPremiumNelvyonDemoProject} showDeliveryPanel />
    </ProtectedLayout>
  );
}
