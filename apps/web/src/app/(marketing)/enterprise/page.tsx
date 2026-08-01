import type { Metadata } from "next";

import { EnterprisePage, pageContent } from "@/features/public-web";

const content = pageContent.enterprise;

export const metadata: Metadata = {
  title: content.seoTitle,
  description: content.seoDescription,
  alternates: { canonical: "/enterprise" },
};

export default function Page() {
  return <EnterprisePage />;
}
