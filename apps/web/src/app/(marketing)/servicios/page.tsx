import type { Metadata } from "next";

import { Acebuilder } from "@/components/pa/acebuilder";
import { Products } from "@/components/pa/products";

export const metadata: Metadata = {
  title: "Servicios | NELVYON — Marketing y automatización",
  description:
    "Capas de ejecución profesional sobre NELVYON: publicidad, SEO, contenido, CRM, automatización y analítica.",
};

export default function ServiciosPage() {
  return (
    <>
      <Acebuilder />
      <Products />
    </>
  );
}
