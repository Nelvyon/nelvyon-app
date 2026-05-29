import type { Metadata } from "next";

import { NvNosotrosPage } from "@/components/nelvyon-marketing/pages/nosotros-page";

export const metadata: Metadata = {
  title: "Nosotros | NELVYON",
  description: "Misión, visión, valores y metodología de NELVYON. Plataforma operativa con red de especialistas.",
};

export default function NosotrosPage() {
  return <NvNosotrosPage />;
}
