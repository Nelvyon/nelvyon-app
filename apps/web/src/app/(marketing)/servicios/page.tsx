import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/pa/container";
import { ServiciosIntro } from "@/components/pa/marketing/servicios-intro";
import { ServiciosCapacidades } from "@/components/pa/marketing/servicios-capacidades";
import { nelvyonServices } from "@/config/nelvyon-pa-content";

export const metadata: Metadata = {
  title: "Servicios | NELVYON — Marketing y automatización",
  description:
    "SEO, publicidad, desarrollo web, ecommerce, automatización, datos, operación digital e IA. Ejecución profesional sobre NELVYON.",
};

export default function ServiciosPage() {
  return (
    <>
      <ServiciosIntro />
      <ServiciosCapacidades />
      <Container className="pb-20">
        <p className="text-muted-foreground text-sm leading-6">
          Servicios con página dedicada:{" "}
          {nelvyonServices.map((service, index) => (
            <span key={service.href}>
              {index > 0 ? " · " : null}
              <Link href={service.href} className="text-[#0084FF] hover:underline">
                {service.title}
              </Link>
            </span>
          ))}
        </p>
      </Container>
    </>
  );
}
