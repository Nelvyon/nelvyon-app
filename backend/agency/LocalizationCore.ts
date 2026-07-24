/**
 * Localization core — locale/timezone/currency contracts for NELVYON SaaS + OS.
 *
 * Honest coverage classification (do not upgrade without a real audit):
 *  - `FULL_VERIFIED`: es, en — default locale + primary secondary locale,
 *    messages catalog audited for the marketing site.
 *  - `PARTIAL_NOT_AUDITED`: fr, de, it, pt — message files exist
 *    (`apps/web/messages/{locale}.json`) for the marketing site, but the
 *    SaaS dashboard UI strings, transactional email templates, and PDF/report
 *    exports have NOT been audited per-surface in this session. Never claim
 *    `FULL_VERIFIED` for these without doing that audit.
 *
 * This module intentionally does not replace `apps/web/i18n.ts` +
 * `next-intl` (the existing routing/message-loading system for the app UI).
 * It documents/formats locale, timezone, and currency concerns that are
 * shared across SaaS + OS + backend services (e.g. billing amounts, report
 * dates) without requiring a large refactor of the existing i18n wiring.
 */

export type LocaleId = "es" | "en" | "fr" | "de" | "it" | "pt";
export type LocaleCoverage = "FULL_VERIFIED" | "PARTIAL_NOT_AUDITED";
export type CurrencyCode = "EUR" | "USD" | "GBP";

export type LocaleCatalogEntry = {
  id: LocaleId;
  label: string;
  coverage: LocaleCoverage;
  coverageNote: string;
  defaultTimezone: string;
  defaultCurrency: CurrencyCode;
};

export const LOCALIZATION_FALLBACK_LOCALE: LocaleId = "es";

export const LOCALE_CATALOG: readonly LocaleCatalogEntry[] = [
  {
    id: "es",
    label: "Español",
    coverage: "FULL_VERIFIED",
    coverageNote: "Locale por defecto — mensajes completos en apps/web/messages/es.json (marketing site).",
    defaultTimezone: "Europe/Madrid",
    defaultCurrency: "EUR",
  },
  {
    id: "en",
    label: "English",
    coverage: "FULL_VERIFIED",
    coverageNote: "Primary secondary locale — full marketing site messages in apps/web/messages/en.json.",
    defaultTimezone: "Etc/UTC",
    defaultCurrency: "USD",
  },
  {
    id: "fr",
    label: "Français",
    coverage: "PARTIAL_NOT_AUDITED",
    coverageNote:
      "Marketing site messages present (apps/web/messages/fr.json); SaaS dashboard UI and email templates not audited per-surface in this session.",
    defaultTimezone: "Europe/Paris",
    defaultCurrency: "EUR",
  },
  {
    id: "de",
    label: "Deutsch",
    coverage: "PARTIAL_NOT_AUDITED",
    coverageNote:
      "Marketing site messages present (apps/web/messages/de.json); SaaS dashboard UI and email templates not audited per-surface in this session.",
    defaultTimezone: "Europe/Berlin",
    defaultCurrency: "EUR",
  },
  {
    id: "it",
    label: "Italiano",
    coverage: "PARTIAL_NOT_AUDITED",
    coverageNote:
      "Marketing site messages present (apps/web/messages/it.json); SaaS dashboard UI and email templates not audited per-surface in this session.",
    defaultTimezone: "Europe/Rome",
    defaultCurrency: "EUR",
  },
  {
    id: "pt",
    label: "Português",
    coverage: "PARTIAL_NOT_AUDITED",
    coverageNote:
      "Marketing site messages present (apps/web/messages/pt.json); SaaS dashboard UI and email templates not audited per-surface in this session.",
    defaultTimezone: "Europe/Lisbon",
    defaultCurrency: "EUR",
  },
] as const;

const INTL_LOCALE_TAGS: Record<LocaleId, string> = {
  es: "es-ES",
  en: "en-US",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-PT",
};

export function listLocales(): LocaleCatalogEntry[] {
  return [...LOCALE_CATALOG];
}

export function listFullyVerifiedLocales(): LocaleCatalogEntry[] {
  return LOCALE_CATALOG.filter((l) => l.coverage === "FULL_VERIFIED");
}

export function listPartialLocales(): LocaleCatalogEntry[] {
  return LOCALE_CATALOG.filter((l) => l.coverage === "PARTIAL_NOT_AUDITED");
}

export function getLocale(id: string): LocaleCatalogEntry | undefined {
  return LOCALE_CATALOG.find((l) => l.id === id);
}

export function isSupportedLocale(id: string | null | undefined): id is LocaleId {
  return LOCALE_CATALOG.some((l) => l.id === id);
}

/** Resolves any input to a supported locale — falls back to `es` for anything unknown/empty. */
export function resolveLocale(preferred: string | null | undefined): LocaleId {
  return isSupportedLocale(preferred) ? preferred : LOCALIZATION_FALLBACK_LOCALE;
}

/** Precedence: tenant preference > user preference > browser locale > fallback (es). */
export function resolveTenantLocale(input: {
  tenantPreferredLocale?: string | null;
  userPreferredLocale?: string | null;
  browserLocale?: string | null;
}): LocaleId {
  if (isSupportedLocale(input.tenantPreferredLocale)) return input.tenantPreferredLocale;
  if (isSupportedLocale(input.userPreferredLocale)) return input.userPreferredLocale;
  if (isSupportedLocale(input.browserLocale)) return input.browserLocale;
  return LOCALIZATION_FALLBACK_LOCALE;
}

export function formatCurrency(amount: number, currency: CurrencyCode, locale: LocaleId = LOCALIZATION_FALLBACK_LOCALE): string {
  return new Intl.NumberFormat(INTL_LOCALE_TAGS[locale], { style: "currency", currency }).format(amount);
}

export function formatDateInTimezone(
  date: Date,
  timezone: string,
  locale: LocaleId = LOCALIZATION_FALLBACK_LOCALE,
): string {
  return new Intl.DateTimeFormat(INTL_LOCALE_TAGS[locale], {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function assertLocalizationCoreIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];

  if (LOCALE_CATALOG.length < 6) violations.push("expected_at_least_6_locales");

  const fullIds = listFullyVerifiedLocales().map((l) => l.id);
  if (!fullIds.includes("es") || !fullIds.includes("en")) {
    violations.push("es_and_en_must_be_full_verified");
  }
  if (fullIds.length !== 2) {
    violations.push("only_es_and_en_may_be_full_verified_without_a_real_audit");
  }

  for (const partial of listPartialLocales()) {
    if (!partial.coverageNote || partial.coverageNote.length < 20) {
      violations.push(`partial_locale_missing_honest_note:${partial.id}`);
    }
  }

  if (!isSupportedLocale(LOCALIZATION_FALLBACK_LOCALE)) violations.push("fallback_locale_must_be_supported");
  if (resolveLocale("xx-not-real") !== LOCALIZATION_FALLBACK_LOCALE) violations.push("unsupported_locale_must_fallback");
  if (resolveLocale(null) !== LOCALIZATION_FALLBACK_LOCALE) violations.push("null_locale_must_fallback");

  if (
    resolveTenantLocale({ tenantPreferredLocale: "en", userPreferredLocale: "fr", browserLocale: "de" }) !== "en"
  ) {
    violations.push("tenant_preference_must_win");
  }
  if (resolveTenantLocale({ userPreferredLocale: "fr", browserLocale: "de" }) !== "fr") {
    violations.push("user_preference_must_win_over_browser");
  }
  if (resolveTenantLocale({}) !== LOCALIZATION_FALLBACK_LOCALE) {
    violations.push("no_preference_must_fallback");
  }

  try {
    formatCurrency(1234.5, "EUR", "es");
    formatCurrency(1234.5, "USD", "en");
    formatCurrency(1234.5, "GBP", "en");
    formatDateInTimezone(new Date(), "Europe/Madrid", "es");
  } catch {
    violations.push("currency_and_date_formatting_must_not_throw_for_supported_values");
  }

  return { ok: violations.length === 0, violations };
}
