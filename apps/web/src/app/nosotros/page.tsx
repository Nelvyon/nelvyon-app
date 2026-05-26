import type { Metadata } from "next";

import { NosotrosPage } from "@/components/landing/nosotros/NosotrosPage";

export const metadata: Metadata = {
  title: "Nosotros — NELVYON",
  description: "Historia, valores y visión de NELVYON. Agencia de marketing digital con tecnología IA.",
};

export default function NosotrosRoutePage() {
  return <NosotrosPage />;
}
