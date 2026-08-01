import type { Metadata } from "next";

import { FaqPage, pageContent } from "@/features/public-web";

const content = pageContent.faq;

export const metadata: Metadata = {
  title: content.seoTitle,
  description: content.seoDescription,
  alternates: { canonical: "/faq" },
};

export default function Page() {
  return <FaqPage />;
}
