import type { Metadata } from "next";

import { StandardPage, pageContent } from "@/features/public-web";

const content = pageContent.seguridad;

export const metadata: Metadata = {
  title: { absolute: content.seoTitle },
  description: content.seoDescription,
  alternates: { canonical: "/seguridad" },
};

export default function Page() {
  return (
    <StandardPage
      content={content}
      imageSrc={"/brand/public/blog-cloud.webp"}
      imageAlt={"Seguridad e infraestructura"}
    />
  );
}
