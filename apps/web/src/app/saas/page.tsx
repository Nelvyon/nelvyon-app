import type { Metadata } from "next";

import { SaasPage } from "@/components/landing/saas/SaasPage";

export const metadata: Metadata = {
  title: "NELVYON SaaS — La plataforma que gestiona todo tu marketing",
  description:
    "Un panel. 25 herramientas. Cero gestión manual. Planes desde €97/mes.",
};

export default function SaasRoutePage() {
  return <SaasPage />;
}
