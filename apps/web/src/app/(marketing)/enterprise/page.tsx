import type { Metadata } from "next";

import { StandardPage, pageContent } from "@/features/public-web";

const content = pageContent.enterprise;

export const metadata: Metadata = {
  title: content.seoTitle,
  description: content.seoDescription,
  alternates: { canonical: "/enterprise" },
};

export default function Page() {
  return (
    <StandardPage
      content={content}
      imageSrc={"/brand/public/enterprise-meeting.webp"}
      imageAlt={"Enterprise NELVYON"}
    />
  );
}
