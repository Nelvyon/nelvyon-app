import type { Metadata } from "next";

import { ResourcesPage, pageContent } from "@/features/public-web";

const content = pageContent.recursos;

export const metadata: Metadata = {
  title: content.seoTitle,
  description: content.seoDescription,
  alternates: { canonical: "/recursos" },
};

export default function Page() {
  return <ResourcesPage />;
}
