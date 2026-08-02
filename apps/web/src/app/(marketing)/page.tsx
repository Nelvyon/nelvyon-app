import type { Metadata } from "next";

import { PublicHomePage, siteBrand } from "@/features/public-web";

export const metadata: Metadata = {
  title: {
    absolute: `${siteBrand.name} — Agencia IA + SaaS B2B`,
  },
  description: siteBrand.description,
  alternates: { canonical: "/" },
};

/** Home pública NELVYON — composición AIOR (Cloud SaaS + BI), contenido real. */
export default function HomePage() {
  return <PublicHomePage />;
}
