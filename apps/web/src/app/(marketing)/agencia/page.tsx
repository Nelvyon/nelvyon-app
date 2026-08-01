import type { Metadata } from "next";

import { StandardPage, pageContent } from "@/features/public-web";

const content = pageContent.agencia;

export const metadata: Metadata = {
  title: content.seoTitle,
  description: content.seoDescription,
  alternates: { canonical: "/agencia" },
};

export default function Page() {
  return (
    <StandardPage
      content={content}
      imageSrc={"/brand/public/agency-collab.webp"}
      imageAlt={"Equipo de agencia NELVYON"}
    />
  );
}
