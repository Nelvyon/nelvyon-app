import type { Metadata } from "next";

import { IntegrationsPage, pageContent } from "@/features/public-web";

const content = pageContent.integraciones;

export const metadata: Metadata = {
  title: content.seoTitle,
  description: content.seoDescription,
  alternates: { canonical: "/integraciones" },
};

export default function Page() {
  return <IntegrationsPage />;
}
