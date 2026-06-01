import { LogoCloudMarquee, NELVYON_INTEGRATION_LOGOS } from "@/components/premium";

const MONO_LOGOS = NELVYON_INTEGRATION_LOGOS.map((logo) => ({
  ...logo,
  brandColor: "FFFFFF",
}));

export function HomeIntegrationsMarquee() {
  return (
    <LogoCloudMarquee
      showTitle={false}
      logos={MONO_LOGOS}
      durationSeconds={58}
    />
  );
}
