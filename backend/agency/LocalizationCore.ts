/**
 * Localization core — locale/timezone/currency contracts for NELVYON SaaS + OS.
 *
 * Honest coverage classification (do not upgrade without a real audit):
 *  - `FULL_VERIFIED`: es, en, fr, de, it, pt — `apps/web/messages/{locale}.json`
 *    has 100% key parity with `es` (the source of truth) for every namespace
 *    in `CRITICAL_MESSAGE_NAMESPACES` (SaaS shell / OS pack / common UI —
 *    next-intl actually serves these to `/saas/*` and `/os/*` via
 *    `apps/web/i18n.ts` + `apps/web/src/i18n/request.ts`, cookie-based, no
 *    URL prefix). Enforced by `computeMessageKeyDiff()` below and by
 *    `backend/agency/__tests__/LocalizationCore.test.ts`, which reads the
 *    real JSON files from disk and fails if parity ever regresses.
 *  - Scope of `FULL_VERIFIED` explicitly EXCLUDES: transactional email
 *    templates (`backend/email/templates/*` — Spanish-only for every locale,
 *    including es/en, not locale-aware) and PDF/report exports (not
 *    localized). This is a pre-existing, locale-independent gap, not a
 *    fr/de/it/pt-specific one — never claim it is fixed without a separate,
 *    real audit of `backend/email`.
 *  - `PARTIAL_NOT_AUDITED` is kept as a valid value (see
 *    `assertLocalizationCoreIntegrity`) for any future locale added before
 *    its message catalog has been verified — a locale must never be marked
 *    `FULL_VERIFIED` without a passing key-parity check backing it.
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

/**
 * next-intl namespaces that back the certified SaaS/OS UI surfaces — the
 * scope of the `FULL_VERIFIED` claim. Deliberately excludes marketing-only
 * namespaces (`hero`, `pricing`, `partners` top-level, testimonials, etc.)
 * per the "not marketing fluff" scope of this audit; those may still lag.
 */
export const CRITICAL_MESSAGE_NAMESPACES = [
  "common",
  "os",
  "shell",
  "sidebar",
  "settingsPage",
  "errors",
  "notifications",
  "saas",
  "dashboard",
  "crm",
  "workflows",
  "campanias",
  "auth",
  "admin",
  "nav",
  "footer",
] as const;

const FULL_VERIFIED_NOTE =
  "Message catalog (apps/web/messages/{locale}.json) has 100% key parity with es for all CRITICAL_MESSAGE_NAMESPACES (SaaS shell / OS pack / common UI) — verified by an automated test reading the real JSON files. Transactional email templates and PDF/report exports are a separate, locale-independent gap (Spanish-only for every locale) not covered by this claim.";

export const LOCALE_CATALOG: readonly LocaleCatalogEntry[] = [
  {
    id: "es",
    label: "Español",
    coverage: "FULL_VERIFIED",
    coverageNote: "Locale por defecto y fuente de verdad — apps/web/messages/es.json.",
    defaultTimezone: "Europe/Madrid",
    defaultCurrency: "EUR",
  },
  {
    id: "en",
    label: "English",
    coverage: "FULL_VERIFIED",
    coverageNote: FULL_VERIFIED_NOTE,
    defaultTimezone: "Etc/UTC",
    defaultCurrency: "USD",
  },
  {
    id: "fr",
    label: "Français",
    coverage: "FULL_VERIFIED",
    coverageNote: FULL_VERIFIED_NOTE,
    defaultTimezone: "Europe/Paris",
    defaultCurrency: "EUR",
  },
  {
    id: "de",
    label: "Deutsch",
    coverage: "FULL_VERIFIED",
    coverageNote: FULL_VERIFIED_NOTE,
    defaultTimezone: "Europe/Berlin",
    defaultCurrency: "EUR",
  },
  {
    id: "it",
    label: "Italiano",
    coverage: "FULL_VERIFIED",
    coverageNote: FULL_VERIFIED_NOTE,
    defaultTimezone: "Europe/Rome",
    defaultCurrency: "EUR",
  },
  {
    id: "pt",
    label: "Português",
    coverage: "FULL_VERIFIED",
    coverageNote: FULL_VERIFIED_NOTE,
    defaultTimezone: "Europe/Lisbon",
    defaultCurrency: "EUR",
  },
] as const;

/** Recursively flattens a JSON-like object into dotted-path keys, e.g. {a:{b:1}} -> ["a.b"]. */
export function flattenMessageKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const out: string[] = [];
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out.push(...flattenMessageKeys(value as Record<string, unknown>, full));
    } else {
      out.push(full);
    }
  }
  return out;
}

export type MessageKeyDiff = {
  namespace: string;
  missing: string[];
  extra: string[];
  ok: boolean;
};

/**
 * Pure key-parity check for one namespace — takes already-parsed message
 * objects (caller reads the real JSON from disk; kept pure/testable here,
 * same separation as `PwaCertification.evaluatePwaManifest`).
 */
export function computeMessageKeyDiff(
  namespace: string,
  baseMessages: Record<string, unknown>,
  localeMessages: Record<string, unknown>,
): MessageKeyDiff {
  const baseNs = (baseMessages[namespace] as Record<string, unknown> | undefined) ?? {};
  const localeNs = (localeMessages[namespace] as Record<string, unknown> | undefined) ?? {};
  const baseKeys = new Set(flattenMessageKeys(baseNs, namespace));
  const localeKeys = new Set(flattenMessageKeys(localeNs, namespace));
  const missing = [...baseKeys].filter((k) => !localeKeys.has(k));
  const extra = [...localeKeys].filter((k) => !baseKeys.has(k));
  return { namespace, missing, extra, ok: missing.length === 0 && extra.length === 0 };
}

/** Runs `computeMessageKeyDiff` for every namespace in `CRITICAL_MESSAGE_NAMESPACES`. */
export function computeCriticalMessageKeyDiffs(
  baseMessages: Record<string, unknown>,
  localeMessages: Record<string, unknown>,
): MessageKeyDiff[] {
  return CRITICAL_MESSAGE_NAMESPACES.map((ns) => computeMessageKeyDiff(ns, baseMessages, localeMessages));
}

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

  // Any FULL_VERIFIED locale other than the `es` baseline must carry a
  // coverageNote that names its real evidence (the automated key-parity
  // test) — no locale may be silently upgraded without that evidence trail.
  for (const full of listFullyVerifiedLocales()) {
    if (full.id === LOCALIZATION_FALLBACK_LOCALE) continue;
    if (!full.coverageNote.toLowerCase().includes("key parity")) {
      violations.push(`full_verified_locale_missing_key_parity_evidence:${full.id}`);
    }
  }

  for (const partial of listPartialLocales()) {
    if (!partial.coverageNote || partial.coverageNote.length < 20) {
      violations.push(`partial_locale_missing_honest_note:${partial.id}`);
    }
  }

  if (CRITICAL_MESSAGE_NAMESPACES.length < 10) violations.push("expected_at_least_10_critical_namespaces");

  // Pure key-parity self-test with in-memory fixtures (no disk access here —
  // the real disk-backed assertion lives in LocalizationCore.test.ts, which
  // reads apps/web/messages/*.json directly, mirroring the PwaCertification
  // pure-core/disk-reading-test split).
  const identicalDiff = computeMessageKeyDiff("common", { common: { a: 1, b: { c: 2 } } }, { common: { a: 1, b: { c: 2 } } });
  if (!identicalDiff.ok) violations.push("identical_catalogs_must_report_no_diff");
  const missingDiff = computeMessageKeyDiff("common", { common: { a: 1, b: 2 } }, { common: { a: 1 } });
  if (missingDiff.ok || !missingDiff.missing.includes("common.b")) {
    violations.push("missing_key_must_be_detected");
  }
  const extraDiff = computeMessageKeyDiff("common", { common: { a: 1 } }, { common: { a: 1, b: 2 } });
  if (extraDiff.ok || !extraDiff.extra.includes("common.b")) {
    violations.push("extra_key_must_be_detected");
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
