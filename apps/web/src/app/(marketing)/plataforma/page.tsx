import type { Metadata } from "next";

import { StandardPage, pageContent } from "@/features/public-web";

const content = pageContent.plataforma;

export const metadata: Metadata = {
  title: content.seoTitle,
  description: content.seoDescription,
  alternates: { canonical: "/plataforma" },
};

export default function Page() {
  return (
    <StandardPage
      content={content}
      imageSrc={"/brand/public/platform-ui.webp"}
      imageAlt={"Plataforma NELVYON"}
    />
  );
}
