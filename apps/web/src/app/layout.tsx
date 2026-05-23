import { cookies, headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { ReactNode } from "react";

import { CookieBanner } from "@/components/CookieBanner";
import { PostHogProvider } from "@/components/PostHogProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { AppProviders } from "@/core/providers/AppProviders";
import { THEME_BOOTSTRAP_SCRIPT } from "@/core/theme/themeBootstrapScript";
import enMessages from "../../messages/en.json";
import esMessages from "../../messages/es.json";
import { inter, dmSans } from "./fonts";
import "./globals.css";

export { metadata, viewport } from "./site-metadata";

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
      <body className={`${inter.variable} ${dmSans.variable} font-sans antialiased`}>
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
