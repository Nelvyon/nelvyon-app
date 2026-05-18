import type { Metadata } from "next";
import type { ReactNode } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://nelvyon.com";
const canonicalBase = BASE_URL.replace(/\/$/, "");
const ogImageAbs = `${canonicalBase}/og-image.png`;

export const metadata: Metadata = {
  title: "NELVYON — Marketing IA Autónomo",
  description:
    "80+ servicios de marketing IA ejecutados automáticamente. SEO, Ads, Email, Branding, Video y más. Sin equipo. Desde 47€/mes.",
  openGraph: {
    title: "NELVYON — Marketing IA Autónomo",
    description:
      "80+ servicios de marketing IA ejecutados automáticamente. Sin equipo. Desde 47€/mes.",
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
    description: "80+ servicios de marketing IA. Sin equipo. Desde 47€/mes.",
    images: [ogImageAbs],
    creator: "@nelvyon",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#080808] text-zinc-100 antialiased">{children}</div>;
}
