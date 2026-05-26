import type { Metadata } from "next";

import { ServiciosPage } from "@/components/landing/servicios/ServiciosPage";

export const metadata: Metadata = {
  title: "Servicios — Agencia marketing digital NELVYON",
  description:
    "SEO, Google Ads, Meta Ads, email marketing, automatización y webs. Precios desde €197/mes. Resultados medibles.",
};

export default function ServiciosRoutePage() {
  return <ServiciosPage />;
}
