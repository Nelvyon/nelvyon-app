import { SocialAutoPublishClient } from "@/app/social/auto-publish/SocialAutoPublishClient";

export default function SocialAutoPublishPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Auto-publicación con IA: copys, creatividades y calendario editorial automático.
      </p>
      <SocialAutoPublishClient />
    </>
  );
}
