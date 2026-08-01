import type { Metadata } from "next";

import { StandardPage, pageContent } from "@/features/public-web";

const content = pageContent["automatizaciones-ia"];

export const metadata: Metadata = {
  title: content.seoTitle,
  description: content.seoDescription,
  alternates: { canonical: "/automatizaciones-ia" },
};

export default function Page() {
  return (
    <StandardPage
      content={content}
      imageSrc={"/brand/public/automation-ui.webp"}
      imageAlt={"Automatizaciones IA"}
    />
  );
}
