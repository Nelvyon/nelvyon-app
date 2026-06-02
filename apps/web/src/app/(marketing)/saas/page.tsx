import type { Metadata } from "next";

import { BentoTwo } from "@/components/pa/bento-two";
import { Pricing } from "@/components/pa/pricing";
import { Products } from "@/components/pa/products";

export const metadata: Metadata = {
  title: "SaaS | NELVYON — Plataforma de marketing y automatización",
  description:
    "Plataforma NELVYON: centraliza campañas, CRM, automatización y reporting. Planes Starter, Growth y Elite.",
};

export default function SaasPage() {
  return (
    <>
      <Products />
      <BentoTwo disabelHeader />
      <Pricing />
    </>
  );
}
