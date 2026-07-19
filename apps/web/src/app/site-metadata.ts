import type { Metadata, Viewport } from "next";

import { getBrandAppName, getBrandMode } from "@/core/platform/brand";
import { getAppOrigin } from "@/lib/appUrl";

/** Brand mark in public/ — SVG is the committed asset (no missing PNG/ICO). */
export const BRAND_LOGO_PATH = "/logo.svg";

const brandMode = getBrandMode();
const appName = getBrandAppName(brandMode);
const origin = getAppOrigin();

const nelvyonMarketingDescription =
  "Agencia de marketing digital con inteligencia artificial. SEO, publicidad, email, webs y automatización desde un solo panel.";

const nelvyonMetadata: Metadata = {
  metadataBase: origin,
  title: {
    default: "NELVYON — Agencia de Marketing Digital con IA",
    template: "%s | NELVYON",
  },
  description: nelvyonMarketingDescription,
  keywords: [
    "agencia marketing digital",
    "marketing con IA",
    "SEO",
    "Google Ads",
    "automatización marketing",
    "SaaS marketing",
  ],
  authors: [{ name: "NELVYON" }],
  creator: "NELVYON",
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: origin.toString(),
    siteName: "NELVYON",
    title: "NELVYON — Agencia de Marketing Digital con IA",
    description: nelvyonMarketingDescription,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "NELVYON" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NELVYON — Agencia de Marketing Digital con IA",
    description: nelvyonMarketingDescription,
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: BRAND_LOGO_PATH, type: "image/svg+xml" }],
    shortcut: BRAND_LOGO_PATH,
    apple: BRAND_LOGO_PATH,
  },
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
