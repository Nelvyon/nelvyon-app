import type { Metadata } from "next";

import { LandingPage } from "@/components/landing";
import { getAppBaseUrl } from "@/lib/appUrl";

const canonicalBase = getAppBaseUrl();
const ogImageAbs = `${canonicalBase}/og-image.png`;

export const metadata: Metadata = {
  title: "NELVYON — Agencia de marketing digital",
  description:
    "Agencia de marketing digital: SEO, Google Ads, Meta, email y automatización. Resultados medibles sin contratar múltiples proveedores.",
  openGraph: {
    title: "NELVYON — Agencia de marketing digital",
    description:
      "Donde nace tu imperio, crece tu marca y se impone tu legado. SEO, publicidad, email y webs.",
    url: canonicalBase,
    siteName: "NELVYON",
    images: [{ url: ogImageAbs, width: 1200, height: 630, alt: "NELVYON Marketing Digital" }],
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "NELVYON — Agencia de marketing digital",
    description: "SEO, ads, email y automatización. Solicita tu propuesta.",
    images: [ogImageAbs],
  },
  robots: { index: true, follow: true },
};

export default function HomePage() {
  return <LandingPage />;
}
