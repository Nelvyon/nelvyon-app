import type { Metadata } from "next";
import { Pricing } from "@/components/pa/pricing";

export const metadata: Metadata = {
  title: "Precios | NELVYON",
  description: "Planes SaaS de NELVYON para centralizar marketing, ventas y operacion.",
};

export default function PricingPage() {
  return <Pricing />;
}
