import type { Metadata } from "next";

import { CasesPage, pageContent } from "@/features/public-web";

const content = pageContent["casos-de-exito"];

export const metadata: Metadata = {
  title: content.seoTitle,
  description: content.seoDescription,
  alternates: { canonical: "/casos-de-exito" },
};

export default function Page() {
  return <CasesPage successStoriesMode />;
}
