"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";

import { type AppLocale, isAppLocale } from "../../../i18n";
import { localeSettingsApi } from "@/features/settings/localeApi";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (next: AppLocale) => Promise<void>;
  timezone: string;
  setTimezone: (tz: string) => void;
  dateFormat: string;
  setDateFormat: (fmt: string) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

async function loadMessages(locale: AppLocale): Promise<Record<string, unknown>> {
  switch (locale) {
    case "en":
      return (await import("../../../messages/en.json")).default;
    case "fr":
      return (await import("../../../messages/fr.json")).default;
    case "pt":
      return (await import("../../../messages/pt.json")).default;
    case "de":
      return (await import("../../../messages/de.json")).default;
    case "it":
      return (await import("../../../messages/it.json")).default;
    default:
      return (await import("../../../messages/es.json")).default;
  }
}

export function LocaleProvider({
  initialLocale,
  initialMessages,
  initialTimezone = "Europe/Madrid",
  initialDateFormat = "DD/MM/YYYY",
  children,
}: {
  initialLocale: AppLocale;
  initialMessages: Record<string, unknown>;
  initialTimezone?: string;
  initialDateFormat?: string;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);
  const [messages, setMessages] = useState(initialMessages);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [dateFormat, setDateFormat] = useState(initialDateFormat);

  const setLocale = useCallback(async (next: AppLocale) => {
    if (!isAppLocale(next) || next === locale) return;
    document.cookie = `NELVYON_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
    try {
      await localeSettingsApi.setLanguage(next);
    } catch {
      /* cookie still applies for UI */
    }
    const nextMessages = await loadMessages(next);
    setLocaleState(next);
    setMessages(nextMessages);
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, timezone, setTimezone, dateFormat, setDateFormat }),
    [locale, setLocale, timezone, dateFormat],
  );

  return (
    <LocaleContext.Provider value={value}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone={timezone}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocaleContext must be used within LocaleProvider");
  }
  return ctx;
}
