import type { Metadata } from "next";

import { AgencyPage, pageContent } from "@/features/public-web";

const content = pageContent.agencia;

export const metadata: Metadata = {
  title: { absolute: content.seoTitle },
  description: content.seoDescription,
  alternates: { canonical: "/agencia" },
}

export default function Page() {
  return <AgencyPage />;
}
