import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { videoMultimediaPremiumNelvyonDemoProject } from "@/templates/video-multimedia-premium/demo";
import { VideoMultimediaPremiumProjectTemplate } from "@/templates/video-multimedia-premium/VideoMultimediaPremiumProjectTemplate";
import { buildVideoPremiumMetadata } from "@/templates/video-multimedia-premium/seo";

export const metadata = buildVideoPremiumMetadata(videoMultimediaPremiumNelvyonDemoProject.pageSeo);

export default function OsVideoMultimediaPremiumPreviewPage() {
  return (
    <ProtectedLayout module="os">
      <VideoMultimediaPremiumProjectTemplate config={videoMultimediaPremiumNelvyonDemoProject} showDeliveryPanel />
    </ProtectedLayout>
  );
}
