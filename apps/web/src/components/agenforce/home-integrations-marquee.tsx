import { LogoCloudMarquee, NELVYON_INTEGRATION_LOGOS } from "@/components/premium";

export function HomeIntegrationsMarquee() {
  return (
    <LogoCloudMarquee
      title="Conecta tus herramientas en un solo sistema"
      subtitle="Marketing, ventas, automatización y operación conectados con las herramientas que ya utiliza tu empresa."
      logos={NELVYON_INTEGRATION_LOGOS}
      durationSeconds={58}
    />
  );
}
