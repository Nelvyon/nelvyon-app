import type { Metadata } from "next";

import { Container } from "@/components/pa/container";
import { PageHeader } from "@/components/pa/page-header";
import { Pricing } from "@/components/pa/pricing";

export const metadata: Metadata = {
  title: "SaaS | NELVYON — Plataforma de marketing y automatización",
  description:
    "Plataforma NELVYON: CRM, automatizaciones, integraciones y reporting. Planes Starter, Growth y Elite.",
};

export default function SaasPage() {
  return (
    <>
      <Container className="relative flex flex-col gap-6 pt-28 md:pt-40">
        <PageHeader>Plataforma SaaS</PageHeader>
        <p className="text-muted-foreground -tracking-xs max-w-2xl text-base leading-6 font-medium">
          Gestiona clientes, pipelines, automatizaciones y reporting desde un entorno conectado a los
          servicios NELVYON. Elige el plan según el volumen y la complejidad de tu operación.
        </p>
      </Container>
      <Pricing />
    </>
  );
}
