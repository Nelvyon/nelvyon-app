import type { Metadata } from "next";

import { NelvyonSaasPage } from "@/components/nelvyon-marketing/pages/saas-page";

export const metadata: Metadata = {
  title: "NELVYON SaaS — La plataforma para agencias de marketing",
  description: "Un panel. 25 herramientas. Agentes expertos. Planes desde €97/mes con 14 días gratis.",
};

export default function SaasRoutePage() {
  return <NelvyonSaasPage />;
}
