import type { Metadata } from "next";

import { PublicHomePage, siteBrand } from "@/features/public-web";

export const metadata: Metadata = {
  title: {
    absolute: `${siteBrand.name} — Agencia IA + SaaS B2B`,
  },
  description: siteBrand.description,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <PublicHomePage />;
}
