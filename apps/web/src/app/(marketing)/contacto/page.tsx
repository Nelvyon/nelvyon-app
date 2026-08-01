import type { Metadata } from "next";

import { ContactPage, pageContent } from "@/features/public-web";

const content = pageContent.contacto;

export const metadata: Metadata = {
  title: content.seoTitle,
  description: content.seoDescription,
  alternates: { canonical: "/contacto" },
};

export default function ContactoRoutePage() {
  return <ContactPage />;
}
