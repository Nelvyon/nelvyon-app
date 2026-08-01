import type { Metadata } from "next";

import { SectorsPage, pageContent } from "@/features/public-web";

const content = pageContent.sectores;

export const metadata: Metadata = {
  title: content.seoTitle,
  description: content.seoDescription,
  alternates: { canonical: "/sectores" },
};

export default function Page() {
  return <SectorsPage />;
}
