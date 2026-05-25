import { defineRouting } from "next-intl/routing";

export const APP_LOCALES = ["es", "en", "fr", "pt", "de", "it"] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export const LOCALE_LABELS: Record<AppLocale, string> = {
  es: "Español",
  en: "English",
  fr: "Français",
  pt: "Português",
  de: "Deutsch",
  it: "Italiano",
};

export const LOCALE_FLAGS: Record<AppLocale, string> = {
  es: "🇪🇸",
  en: "🇬🇧",
  fr: "🇫🇷",
  pt: "🇵🇹",
  de: "🇩🇪",
  it: "🇮🇹",
};

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return APP_LOCALES.includes(value as AppLocale);
}

export const routing = defineRouting({
  locales: [...APP_LOCALES],
  defaultLocale: "es",
  /** Cookie-based locale via LocaleProvider; marketing routes stay unprefixed. */
  localePrefix: "never",
  localeDetection: false,
  localeCookie: {
    name: "NELVYON_LOCALE",
  },
});
