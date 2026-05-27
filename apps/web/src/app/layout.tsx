import { cookies, headers } from "next/headers";
import { ReactNode } from "react";

import { ChatbotWidget } from "@/components/ChatbotWidget";
import { CookieBanner } from "@/components/CookieBanner";
import { PostHogProvider } from "@/components/PostHogProvider";
import { LocaleProvider } from "@/core/i18n/LocaleProvider";
import { AppProviders } from "@/core/providers/AppProviders";
import { ThemeProvider } from "@/providers/theme-provider";
import { inter, dmSans, manrope } from "./fonts";
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

  return (
    <html lang={locale} suppressHydrationWarning className="dark scroll-smooth">
      <head>
        <link href={faviconHref} rel="icon" />
        <link href="/manifest.json" rel="manifest" />
        <meta content="#07122a" name="theme-color" />
        <meta content="yes" name="apple-mobile-web-app-capable" />
        <meta content="black-translucent" name="apple-mobile-web-app-status-bar-style" />
        <meta content="NELVYON" name="apple-mobile-web-app-title" />
        <link href="/icons/icon-192x192.png" rel="apple-touch-icon" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}
`,
          }}
          suppressHydrationWarning
        />
      </head>
      <body className={`${inter.variable} ${manrope.variable} ${dmSans.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <PostHogProvider>
            <LocaleProvider initialLocale={locale} initialMessages={messages}>
              <AppProviders whitelabelInitial={whitelabelInitial}>
                <main className="bg-background text-foreground min-h-screen">{children}</main>
              </AppProviders>
            </LocaleProvider>
            <CookieBanner />
            <ChatbotWidget />
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
