import { cookies, headers } from "next/headers";
import { ReactNode } from "react";

import { CookieBanner } from "@/components/CookieBanner";
import { PostHogProvider } from "@/components/PostHogProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { LocaleProvider } from "@/core/i18n/LocaleProvider";
import { AppProviders } from "@/core/providers/AppProviders";
import { THEME_BOOTSTRAP_SCRIPT } from "@/core/theme/themeBootstrapScript";
import { inter, dmSans } from "./fonts";
import "./globals.css";
import { APP_LOCALES, isAppLocale, type AppLocale } from "../../i18n";
import { decodeWhitelabelHeader } from "@/core/whitelabel/resolveWhitelabel";

export { metadata, viewport } from "./site-metadata";

async function resolveLocale(): Promise<AppLocale> {
  try {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get("NELVYON_LOCALE")?.value;
    if (isAppLocale(cookieLocale)) return cookieLocale;
  } catch {
    /* cookies unavailable */
  }

  try {
    const headerStore = await headers();
    const acceptLang = headerStore.get("accept-language")?.toLowerCase() ?? "";
    for (const loc of APP_LOCALES) {
      if (acceptLang.startsWith(loc)) return loc;
    }
    if (acceptLang.includes("en")) return "en";
    if (acceptLang.includes("fr")) return "fr";
    if (acceptLang.includes("pt")) return "pt";
    if (acceptLang.includes("de")) return "de";
    if (acceptLang.includes("it")) return "it";
  } catch {
    /* headers unavailable */
  }

  return "es";
}

async function loadMessages(locale: AppLocale): Promise<Record<string, unknown>> {
  switch (locale) {
    case "en":
      return (await import("../../messages/en.json")).default as Record<string, unknown>;
    case "fr":
      return (await import("../../messages/fr.json")).default as Record<string, unknown>;
    case "pt":
      return (await import("../../messages/pt.json")).default as Record<string, unknown>;
    case "de":
      return (await import("../../messages/de.json")).default as Record<string, unknown>;
    case "it":
      return (await import("../../messages/it.json")).default as Record<string, unknown>;
    default:
      return (await import("../../messages/es.json")).default as Record<string, unknown>;
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  let locale: AppLocale = "es";
  let messages: Record<string, unknown> = {};
  let whitelabelInitial = null;

  try {
    locale = await resolveLocale();
    messages = await loadMessages(locale);
  } catch (err) {
    console.error("[nelvyon] RootLayout bootstrap failed, using defaults", err);
    messages = (await import("../../messages/es.json")).default as Record<string, unknown>;
  }

  try {
    const headerStore = await headers();
    whitelabelInitial = decodeWhitelabelHeader(headerStore.get("x-nelvyon-whitelabel"));
  } catch {
    /* headers unavailable */
  }

  const faviconHref = whitelabelInitial?.favicon_url?.trim() || "/favicon.ico";
  const themeColor = whitelabelInitial?.primary_color || "#0a0a0a";

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link href={faviconHref} rel="icon" />
        <link href="/manifest.json" rel="manifest" />
        <meta content={themeColor} name="theme-color" />
        <meta content="yes" name="apple-mobile-web-app-capable" />
      </head>
      <body className={`${inter.variable} ${dmSans.variable} font-sans antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} suppressHydrationWarning />
        <PostHogProvider>
          <LocaleProvider initialLocale={locale} initialMessages={messages}>
            <AppProviders whitelabelInitial={whitelabelInitial}>{children}</AppProviders>
          </LocaleProvider>
          <CookieBanner />
          <ServiceWorkerRegister />
        </PostHogProvider>
      </body>
    </html>
  );
}
