import type { Metadata } from "next";

import { SaasPage } from "@/components/landing/saas/SaasPage";

export const metadata: Metadata = {
  title: "NELVYON SaaS — La plataforma que reemplaza 20 herramientas",
  description:
    "CRM, email, publicidad IA, webs y automatización en un solo software. Planes desde €97/mes. Prueba 14 días gratis.",
};

export default function SaasRoutePage() {
  return <SaasPage />;
}
