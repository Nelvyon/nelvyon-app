import type { Metadata } from "next";

import { CasesPage } from "@/features/public-web";

export const metadata: Metadata = {
  title: "Casos de uso | NELVYON",
  description:
    "Perfiles tipificados de implementación: captación local, retención ecommerce, pipeline SaaS B2B y gobierno enterprise.",
  alternates: { canonical: "/casos-de-uso" },
};

export default function Page() {
  return <CasesPage />;
}
