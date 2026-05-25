"use client";

import { useLocaleContext } from "@/core/i18n/LocaleProvider";

const FORMATTERS: Record<string, Intl.DateTimeFormatOptions> = {
  "DD/MM/YYYY": { day: "2-digit", month: "2-digit", year: "numeric" },
  "MM/DD/YYYY": { month: "2-digit", day: "2-digit", year: "numeric" },
  "YYYY-MM-DD": { year: "numeric", month: "2-digit", day: "2-digit" },
};

export function useFormatDate() {
  const { timezone, dateFormat, locale } = useLocaleContext();

  return function formatDate(value: string | Date | number | null | undefined): string {
    if (!value) return "—";
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    const opts = FORMATTERS[dateFormat] ?? FORMATTERS["DD/MM/YYYY"];
    try {
      return new Intl.DateTimeFormat(locale, { ...opts, timeZone: timezone }).format(d);
    } catch {
      return d.toLocaleDateString(locale);
    }
  };
}

export function useFormatDateTime() {
  const { timezone, locale } = useLocaleContext();

  return function formatDateTime(value: string | Date | number | null | undefined): string {
    if (!value) return "—";
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: timezone,
      }).format(d);
    } catch {
      return d.toLocaleString(locale);
    }
  };
}
