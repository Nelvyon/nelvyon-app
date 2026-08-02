import type { Metadata } from "next";

import { ProductHubPage } from "@/features/public-web";

export const metadata: Metadata = {
  title: "SaaS B2B",
  description:
    "SaaS NELVYON: CRM, pipeline, campañas, workflows, inbox, billing, IA y portal cliente en un entorno multi-tenant.",
  alternates: { canonical: "/producto" },
};

export default function Page() {
  return <ProductHubPage />;
}
