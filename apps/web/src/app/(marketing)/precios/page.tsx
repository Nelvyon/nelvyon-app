import type { Metadata } from "next";

import { PricingPage } from "@/features/public-web";

export const metadata: Metadata = {
  title: "Precios",
  description:
    "Planes SaaS NELVYON: Starter €97, Growth €297 y Elite €797. CRM, campañas, workflows y automatización.",
  alternates: { canonical: "/precios" },
};

export default function PreciosRoutePage() {
  return <PricingPage />;
}
