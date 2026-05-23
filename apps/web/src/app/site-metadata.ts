import type { Metadata, Viewport } from "next";

import { getBrandAppName, getBrandMode } from "@/core/platform/brand";
import { getAppBaseUrl, getAppOrigin } from "@/lib/appUrl";

const brandMode = getBrandMode();
const appName = getBrandAppName(brandMode);
const canonicalBase = getAppBaseUrl();

const nelvyonMarketingDescription =
  "Plataforma de marketing con inteligencia artificial. Automatiza SEO, ads, contenido y más.";

const nelvyonMetadata: Metadata = {
  metadataBase: getAppOrigin(),
  title: {
    default: "NELVYON — Marketing IA Automatizado",
    template: "%s | NELVYON",
  },
  description: nelvyonMarketingDescription,
  keywords: ["marketing IA", "automatización marketing", "SaaS marketing", "agentes IA"],
  authors: [{ name: "NELVYON" }],
  creator: "NELVYON",
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: canonicalBase,
    siteName: "NELVYON",
    title: "NELVYON — Marketing IA Automatizado",
    description: nelvyonMarketingDescription,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "NELVYON" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NELVYON — Marketing IA Automatizado",
    description: nelvyonMarketingDescription,
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "NELVYON" },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim()
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION.trim() } }
    : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0a",
};

export const metadata: Metadata =
  brandMode === "client"
    ? {
        title: {
          default: `${appName} — Workspace`,
          template: `%s · ${appName}`,
        },
        description: `${appName} client portal.`,
      }
    : nelvyonMetadata;
