import type { Metadata } from "next";

import { NvSaasPage } from "@/components/nelvyon-marketing/pages/saas-page";

export const metadata: Metadata = {
  title: "SaaS | NELVYON — Plataforma de marketing y automatización",
  description:
    "Plataforma NELVYON: centraliza campañas, CRM, automatización y reporting. Planes Starter, Growth y Elite.",
};

export default function SaasPage() {
  return <NvSaasPage />;
}
