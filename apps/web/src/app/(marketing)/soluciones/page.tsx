import type { Metadata } from "next";

import { StandardPage, pageContent } from "@/features/public-web";

const content = pageContent.soluciones;

export const metadata: Metadata = {
  title: content.seoTitle,
  description: content.seoDescription,
  alternates: { canonical: "/soluciones" },
};

export default function Page() {
  return (
    <StandardPage
      content={content}
      imageSrc={"/brand/public/analytics-ui.webp"}
      imageAlt={"Soluciones NELVYON"}
    />
  );
}
