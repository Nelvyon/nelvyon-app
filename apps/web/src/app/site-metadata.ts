import type { Metadata, Viewport } from "next";

import { getBrandAppName, getBrandMode } from "@/core/platform/brand";
import { getAppOrigin } from "@/lib/appUrl";

const brandMode = getBrandMode();
const appName = getBrandAppName(brandMode);

const nelvyonMarketingDescription =
  "Agencia de marketing digital con inteligencia artificial. SEO, publicidad, email, webs y automatización desde un solo panel.";

const nelvyonMetadata: Metadata = {
  metadataBase: getAppOrigin(),
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
    url: "https://nelvyon.com",
    siteName: "NELVYON",
    title: "NELVYON — Agencia de Marketing Digital con IA",
    description: nelvyonMarketingDescription,
    images: [{ url: "/logo.png.png", width: 512, height: 512, alt: "NELVYON" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NELVYON — Agencia de Marketing Digital con IA",
    description: nelvyonMarketingDescription,
    images: ["/logo.png.png"],
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }],
    shortcut: "/favicon.ico",
    apple: "/logo.png.png",
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
