import type { Metadata } from "next";
import Link from "next/link";

import { Acebuilder } from "@/components/pa/acebuilder";
import { Container } from "@/components/pa/container";
import { Products } from "@/components/pa/products";
import { ServiciosIntro } from "@/components/pa/marketing/servicios-intro";

export const metadata: Metadata = {
  title: "Servicios | NELVYON — Marketing y automatización",
  description:
    "SEO, publicidad, branding, desarrollo web, ecommerce, automatización, contenido y email. Ejecución profesional sobre NELVYON.",
};

export default function ServiciosPage() {
  return (
    <>
      <ServiciosIntro />
      <Acebuilder />
      <Products />
      <Container className="pb-20">
        <p className="text-muted-foreground text-sm leading-6">
          También disponibles:{" "}
          <Link href="/contenido" className="text-[#0084FF] hover:underline">
            Contenido
          </Link>
          {" · "}
          <Link href="/email-marketing" className="text-[#0084FF] hover:underline">
            Email Marketing
          </Link>
        </p>
      </Container>
    </>
  );
}
