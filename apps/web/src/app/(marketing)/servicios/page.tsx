import type { Metadata } from "next";

import { NvServiciosPage } from "@/components/nelvyon-marketing/pages/servicios-page";

export const metadata: Metadata = {
  title: "Servicios | NELVYON — Marketing y automatización",
  description:
    "Capas de ejecución profesional sobre NELVYON: publicidad, SEO, contenido, CRM, automatización y analítica.",
};

export default function ServiciosPage() {
  return <NvServiciosPage />;
}
