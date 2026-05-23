import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { ReactNode } from "react";

import { CookieBanner } from "@/components/CookieBanner";
import { PostHogProvider } from "@/components/PostHogProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { getBrandAppName, getBrandMode } from "@/core/platform/brand";
import { AppProviders } from "@/core/providers/AppProviders";
import { THEME_BOOTSTRAP_SCRIPT } from "@/core/theme/themeBootstrapScript";
import { getAppBaseUrl, getAppOrigin } from "@/lib/appUrl";
import enMessages from "../../messages/en.json";
import esMessages from "../../messages/es.json";
import "./globals.css";

const brandMode = getBrandMode();
const appName = getBrandAppName(brandMode);

// TODO: añadir /public/og-image.png (1200×630px) — asset manual diseño web.

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

async function resolveLocale(): Promise<"es" | "en"> {
  try {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get("NELVYON_LOCALE")?.value;
    if (cookieLocale === "es" || cookieLocale === "en") return cookieLocale;
  } catch {
    /* cookies() unavailable — use Accept-Language or default */
  }

  try {
    const headerStore = await headers();
    const acceptLang = headerStore.get("accept-language")?.toLowerCase() ?? "";
    if (acceptLang.startsWith("en")) return "en";
  } catch {
    /* headers() unavailable */
  }

  return "es";
}

function loadMessages(locale: "es" | "en"): Record<string, unknown> {
  try {
    return (locale === "en" ? enMessages : esMessages) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  let locale: "es" | "en" = "es";
  let messages: Record<string, unknown> = esMessages as Record<string, unknown>;

  try {
    locale = await resolveLocale();
    messages = loadMessages(locale);
  } catch (err) {
    console.error("[nelvyon] RootLayout bootstrap failed, using defaults", err);
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link href="/manifest.json" rel="manifest" />
        <meta content="#0a0a0a" name="theme-color" />
        <meta content="yes" name="apple-mobile-web-app-capable" />
      </head>
      <body>
        {/* Runs before React paint to avoid light/dark flash; keep in sync with ThemeProvider. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} suppressHydrationWarning>
        </script>
        <PostHogProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <AppProviders>{children}</AppProviders>
          </NextIntlClientProvider>
          <CookieBanner />
          <ServiceWorkerRegister />
        </PostHogProvider>
      </body>
    </html>
  );
}
