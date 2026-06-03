import type { Metadata } from "next";

import { SaasModules } from "@/components/pa/marketing/saas-modules";
import { Container } from "@/components/pa/container";
import { PageHeader } from "@/components/pa/page-header";
import { Pricing } from "@/components/pa/pricing";

export const metadata: Metadata = {
  title: "SaaS | NELVYON — Plataforma de marketing y automatización",
  description:
    "Plataforma NELVYON: CRM, leads, pipeline, automatizaciones, IA e integraciones. Planes Starter, Growth y Elite.",
};

export default function SaasPage() {
  return (
    <>
      <Container className="relative flex flex-col gap-6 pt-28 md:pt-40">
        <PageHeader>Plataforma SaaS</PageHeader>
        <p className="text-muted-foreground -tracking-xs max-w-2xl text-base leading-6 font-medium">
          El dashboard NELVYON concentra CRM, campañas, workflows e integraciones. Los módulos
          activos dependen de tu plan y configuración de workspace.
        </p>
      </Container>
      <SaasModules />
      <Pricing />
    </>
  );
}
