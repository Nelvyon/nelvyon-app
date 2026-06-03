import type { Metadata } from "next";

import { SaasPageContent } from "@/components/pa/marketing/saas-page-content";
import { nelvyonSaasHero } from "@/config/nelvyon-marketing-pages";

export const metadata: Metadata = {
  title: "SaaS | NELVYON — Plataforma de crecimiento digital",
  description: nelvyonSaasHero.subtitle,
};

export default function SaasPage() {
  return <SaasPageContent />;
}
