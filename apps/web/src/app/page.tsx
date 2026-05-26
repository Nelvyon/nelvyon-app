import type { Metadata } from "next";

import { LandingPage } from "@/components/landing";
import { getAppBaseUrl } from "@/lib/appUrl";

const canonicalBase = getAppBaseUrl();
const ogImageAbs = `${canonicalBase}/og-image.png`;

export const metadata: Metadata = {
  title: "NELVYON — Donde nace tu imperio",
  description:
    "Donde nace tu imperio, crece tu marca y se impone tu legado. Plataforma de marketing con tecnología IA: SEO, publicidad, contenido, email, CRM y social media.",
  openGraph: {
    title: "NELVYON — Marketing con tecnología IA",
    description:
      "Donde nace tu imperio, crece tu marca y se impone tu legado. Plataforma SaaS premium de marketing todo en uno.",
    url: canonicalBase,
    siteName: "NELVYON",
    images: [
      {
        url: ogImageAbs,
        width: 1200,
        height: 630,
        alt: "NELVYON — Plataforma de marketing IA",
      },
    ],
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "NELVYON — Marketing con tecnología IA",
    description: "Plataforma de marketing todo en uno. Planes desde 97€/mes.",
    images: [ogImageAbs],
    creator: "@nelvyon",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HomePage() {
  return <LandingPage />;
}
