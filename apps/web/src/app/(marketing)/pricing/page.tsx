import type { Metadata } from "next";
import { Pricing } from "@/components/pa/pricing";
import { nelvyonPageCtas } from "@/config/nelvyon-pa-content";

export const metadata: Metadata = {
  title: "Precios | NELVYON",
  description:
    "Planes SaaS NELVYON: Starter, Growth y Elite. Para quién es cada plan y qué incluye.",
};

export default function PricingPage() {
  return <Pricing ctaText={nelvyonPageCtas.saas} />;
}
