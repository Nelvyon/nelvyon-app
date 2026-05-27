import type { Metadata } from "next";

import { NelvyonServiciosPage } from "@/components/nelvyon-marketing/pages/servicios-page";

export const metadata: Metadata = {
  title: "Servicios — NELVYON",
  description:
    "CRM, email marketing, automatizaciones, pagos, funnels, analíticas, WhatsApp y gestión de anuncios para agencias.",
};

export default function ServiciosRoutePage() {
  return <NelvyonServiciosPage />;
}
