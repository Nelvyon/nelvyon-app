/**
 * Localization core — locale/timezone/currency contracts for NELVYON SaaS + OS.
 *
 * Honest coverage classification (do not upgrade without a real audit):
 *  - `FULL_VERIFIED` (UI catalogs only): es, en, fr, de, it, pt —
 *    `apps/web/messages/{locale}.json` has 100% key parity with `es` (source of
 *    truth) for EVERY top-level namespace (not only CRITICAL). Enforced by
 *    `computeAllMessageKeyDiffs()` + disk-backed tests in
 *    `LocalizationCore.test.ts`. Known Spanish leftover keys listed in
 *    `KNOWN_SPANISH_LEFTOVER_KEYS` must not remain identical-to-es for
 *    fr/de/it/pt. next-intl serves these via cookie (`NELVYON_LOCALE`);
 *    RegionBootstrap prefers workspace locale > user language > cookie > es
 *    via `resolveTenantLocale`.
 *  - Email: PARTIAL — `backend/email/localeCopy.ts` localizes Resend templates
 *    welcome/passwordReset/invoice/jobCompleted/onboardingComplete plus SES
 *    catalog payment_failed + cancellation (es/en/fr/de/it/pt). Remaining SES
 *    catalog templates and `backend/billing/*EmailTemplates.ts` dunning sequence
 *    stay Spanish-only. NEVER claim email FULL_VERIFIED.
 *  - PDF/reports: PARTIAL — `backend/saas/pdfLocaleLabels.ts` provides
 *    quote/invoice chrome labels for es/en/fr/de/it/pt. Status badges and
 *    full legal copy are not fully localized. NEVER claim PDF FULL_VERIFIED.
 *  - `PARTIAL_NOT_AUDITED` remains valid for any future locale added before
 *    its message catalog has been verified.
 *
 * This module does not replace `apps/web/i18n.ts` + next-intl.
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
 * next-intl namespaces that back the certified SaaS/OS UI surfaces.
 * FULL_VERIFIED also requires full key parity across ALL namespaces (see
 * `computeAllMessageKeyDiffs`); this list is the product-critical subset.
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

/**
 * Keys that historically leaked Spanish into fr/de/it/pt catalogs.
 * Disk tests fail if any of these remain identical to es for those locales.
 */
export const KNOWN_SPANISH_LEFTOVER_KEYS = [
  "auth.login.title",
  "auth.login.no_account",
  "auth.register.has_account",
  "crm.new_contact",
  "crm.search",
  "crm.no_contacts",
  "workflows.new_workflow",
  "workflows.no_workflows",
  "campanias.title",
  "campanias.no_campanias",
  "admin.stats.total_tenants",
  "admin.stats.total_jobs",
  "os.execution.no_jobs",
  "os.intake.title",
  "pricing.annual",
  "partners.title",
] as const;

const FULL_VERIFIED_NOTE =
  "UI message catalog (apps/web/messages/{locale}.json) has 100% key parity with es for ALL namespaces — verified by automated disk tests. Shell/nav-critical saas.nav + saas.common + saas.errors + saas.settings are natively localized for fr/de/it/pt (2026-07-25). Remaining saas.* module pages may still use English copy (content quality gap; not Spanish leftovers; key parity intact). Email is PARTIAL (Resend welcome/passwordReset/invoice/jobCompleted/onboardingComplete + SES payment_failed/cancellation localized; other SES catalog + billing dunning/offboarding templates Spanish-only). PDF is PARTIAL (quote/invoice label maps for es/en/fr/de/it/pt; not full document localization). Do not claim email/PDF FULL_VERIFIED.";

export const LOCALE_CATALOG: readonly LocaleCatalogEntry[] = [
  {
    id: "es",
    label: "Español",
    coverage: "FULL_VERIFIED",
    coverageNote:
      "Locale por defecto y fuente de verdad — apps/web/messages/es.json. Email/PDF: PARTIAL (same gaps as other locales).",
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

/** Reads a dotted path from a nested messages object (e.g. "auth.login.title"). */
export function getMessageByPath(messages: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = messages;
  for (const part of parts) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
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

/** Key parity for every top-level object namespace present in the base (es) catalog. */
export function computeAllMessageKeyDiffs(
  baseMessages: Record<string, unknown>,
  localeMessages: Record<string, unknown>,
): MessageKeyDiff[] {
  const namespaces = Object.keys(baseMessages).filter((ns) => {
    const v = baseMessages[ns];
    return v !== null && typeof v === "object" && !Array.isArray(v);
  });
  return namespaces.map((ns) => computeMessageKeyDiff(ns, baseMessages, localeMessages));
}

/**
 * Returns known leftover paths whose string value is still identical to es
 * for the given locale catalog (Spanish leak detector).
 */
export function findIdenticalToEsLeftovers(
  esMessages: Record<string, unknown>,
  localeMessages: Record<string, unknown>,
  keys: readonly string[] = KNOWN_SPANISH_LEFTOVER_KEYS,
): string[] {
  const leaks: string[] = [];
  for (const key of keys) {
    const esVal = getMessageByPath(esMessages, key);
    const locVal = getMessageByPath(localeMessages, key);
    if (typeof esVal === "string" && typeof locVal === "string" && esVal === locVal) {
      leaks.push(key);
    }
  }
  return leaks;
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

  for (const full of listFullyVerifiedLocales()) {
    if (full.id === LOCALIZATION_FALLBACK_LOCALE) continue;
    if (!full.coverageNote.toLowerCase().includes("key parity")) {
      violations.push(`full_verified_locale_missing_key_parity_evidence:${full.id}`);
    }
    if (!full.coverageNote.toLowerCase().includes("email is partial") && !full.coverageNote.toLowerCase().includes("email: partial")) {
      // Accept either phrasing in coverageNote
      if (!full.coverageNote.toLowerCase().includes("partial")) {
        violations.push(`full_verified_locale_must_disclose_email_pdf_partial:${full.id}`);
      }
    }
  }

  for (const partial of listPartialLocales()) {
    if (!partial.coverageNote || partial.coverageNote.length < 20) {
      violations.push(`partial_locale_missing_honest_note:${partial.id}`);
    }
  }

  if (CRITICAL_MESSAGE_NAMESPACES.length < 10) violations.push("expected_at_least_10_critical_namespaces");
  if (KNOWN_SPANISH_LEFTOVER_KEYS.length < 10) violations.push("expected_known_spanish_leftover_key_list");

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

  const allDiffs = computeAllMessageKeyDiffs({ common: { a: 1 }, os: { b: 2 } }, { common: { a: 1 }, os: { b: 2 } });
  if (allDiffs.length !== 2 || allDiffs.some((d) => !d.ok)) {
    violations.push("all_namespace_parity_self_test_failed");
  }

  const leakFixture = findIdenticalToEsLeftovers(
    { auth: { login: { title: "ES" } } },
    { auth: { login: { title: "ES" } } },
    ["auth.login.title"],
  );
  if (!leakFixture.includes("auth.login.title")) violations.push("spanish_leftover_detector_must_flag_identical");
  const cleanFixture = findIdenticalToEsLeftovers(
    { auth: { login: { title: "ES" } } },
    { auth: { login: { title: "EN" } } },
    ["auth.login.title"],
  );
  if (cleanFixture.length !== 0) violations.push("spanish_leftover_detector_must_ignore_translated");

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
