import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getAppBaseUrl } from "@/lib/appUrl";

const canonicalBase = getAppBaseUrl();
const ogImageAbs = `${canonicalBase}/og-image.png`;

export const metadata: Metadata = {
  title: "NELVYON — Marketing IA Autónomo",
  description:
    "Marketing autónomo con IA: SEO, publicidad, contenido, email y branding. Planes desde 95€/mes. Sin equipo.",
  openGraph: {
    title: "NELVYON — Marketing IA Autónomo",
    description:
      "SEO, ads, contenido, email y branding con agentes IA. Planes desde 95€/mes.",
    url: canonicalBase,
    siteName: "NELVYON",
    images: [
      {
        url: ogImageAbs,
        width: 1200,
        height: 630,
        alt: "NELVYON — Marketing IA Autónomo",
      },
    ],
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "NELVYON — Marketing IA Autónomo",
    description: "Marketing IA autónomo. Planes desde 95€/mes.",
    images: [ogImageAbs],
    creator: "@nelvyon",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 antialiased">{children}</div>;
}
