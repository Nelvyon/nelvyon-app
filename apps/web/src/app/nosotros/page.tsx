import type { Metadata } from "next";

import { NelvyonNosotrosPage } from "@/components/nelvyon-marketing/pages/nosotros-page";

export const metadata: Metadata = {
  title: "Nosotros — NELVYON",
  description: "Misión, visión y valores de NELVYON. Plataforma para agencias de marketing digital.",
};

export default function NosotrosRoutePage() {
  return <NelvyonNosotrosPage />;
}
