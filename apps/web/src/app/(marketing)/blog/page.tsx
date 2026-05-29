import type { Metadata } from "next";

import { NvBlogPage } from "@/components/nelvyon-marketing/pages/blog-page";

export const metadata: Metadata = {
  title: "Blog | NELVYON",
  description: "Guías y reflexiones sobre automatización, campañas, CRM, contenido y reporting.",
};

export default function BlogPage() {
  return <NvBlogPage />;
}
