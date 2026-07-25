import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CRITICAL_MESSAGE_NAMESPACES,
  LOCALIZATION_FALLBACK_LOCALE,
  LOCALE_CATALOG,
  assertLocalizationCoreIntegrity,
  computeCriticalMessageKeyDiffs,
  computeMessageKeyDiff,
  flattenMessageKeys,
  formatCurrency,
  formatDateInTimezone,
  getLocale,
  isSupportedLocale,
  listFullyVerifiedLocales,
  listLocales,
  listPartialLocales,
  resolveLocale,
  resolveTenantLocale,
  type LocaleId,
} from "../LocalizationCore";

describe("LocalizationCore", () => {
  it("passes its own integrity assertion", () => {
    expect(assertLocalizationCoreIntegrity()).toEqual({ ok: true, violations: [] });
  });

  it("declares es, en, fr, de, it, pt as FULL_VERIFIED (backed by the real key-parity test below)", () => {
    const full = listFullyVerifiedLocales().map((l) => l.id);
    expect(full.sort()).toEqual(["de", "en", "es", "fr", "it", "pt"]);
  });

  it("every non-baseline FULL_VERIFIED locale documents its key-parity evidence", () => {
    for (const l of listFullyVerifiedLocales()) {
      if (l.id === LOCALIZATION_FALLBACK_LOCALE) continue;
      expect(l.coverageNote.toLowerCase()).toContain("key parity");
    }
  });

  it("declares no PARTIAL_NOT_AUDITED locales today (all 6 are verified)", () => {
    expect(listPartialLocales()).toEqual([]);
  });

  it("lists a defensive copy of the catalog", () => {
    const list = listLocales();
    expect(list.length).toBe(LOCALE_CATALOG.length);
    list.pop();
    expect(LOCALE_CATALOG.length).not.toBe(list.length);
  });

  it("isSupportedLocale / getLocale behave consistently", () => {
    expect(isSupportedLocale("es")).toBe(true);
    expect(isSupportedLocale("xx")).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
    expect(getLocale("en")?.label).toBe("English");
    expect(getLocale("xx")).toBeUndefined();
  });

  it("resolveLocale falls back to the default locale for unsupported/empty input", () => {
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("xx")).toBe(LOCALIZATION_FALLBACK_LOCALE);
    expect(resolveLocale(undefined)).toBe(LOCALIZATION_FALLBACK_LOCALE);
    expect(resolveLocale(null)).toBe(LOCALIZATION_FALLBACK_LOCALE);
  });

  it("resolveTenantLocale honors precedence: tenant > user > browser > fallback", () => {
    expect(
      resolveTenantLocale({ tenantPreferredLocale: "de", userPreferredLocale: "en", browserLocale: "fr" }),
    ).toBe("de");
    expect(resolveTenantLocale({ userPreferredLocale: "en", browserLocale: "fr" })).toBe("en");
    expect(resolveTenantLocale({ browserLocale: "fr" })).toBe("fr");
    expect(resolveTenantLocale({})).toBe(LOCALIZATION_FALLBACK_LOCALE);
    expect(resolveTenantLocale({ tenantPreferredLocale: "not-real" })).toBe(LOCALIZATION_FALLBACK_LOCALE);
  });

  it("formats currency for EUR/USD/GBP without throwing", () => {
    expect(formatCurrency(1234.5, "EUR", "es")).toMatch(/€|EUR/);
    expect(formatCurrency(1234.5, "USD", "en")).toMatch(/\$|USD/);
    expect(formatCurrency(1234.5, "GBP", "en")).toMatch(/£|GBP/);
  });

  it("formats a date in a given timezone without throwing", () => {
    const formatted = formatDateInTimezone(new Date("2026-01-15T10:00:00Z"), "Europe/Madrid", "es");
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(0);
  });
});

describe("LocalizationCore — computeMessageKeyDiff (pure, in-memory fixtures)", () => {
  it("reports ok=true for identical catalogs", () => {
    const diff = computeMessageKeyDiff("common", { common: { a: 1, b: { c: 2 } } }, { common: { a: 1, b: { c: 2 } } });
    expect(diff.ok).toBe(true);
    expect(diff.missing).toEqual([]);
    expect(diff.extra).toEqual([]);
  });

  it("detects a missing key", () => {
    const diff = computeMessageKeyDiff("common", { common: { a: 1, b: 2 } }, { common: { a: 1 } });
    expect(diff.ok).toBe(false);
    expect(diff.missing).toEqual(["common.b"]);
  });

  it("detects an extra key", () => {
    const diff = computeMessageKeyDiff("common", { common: { a: 1 } }, { common: { a: 1, b: 2 } });
    expect(diff.ok).toBe(false);
    expect(diff.extra).toEqual(["common.b"]);
  });

  it("treats a missing namespace as an empty object (all base keys reported missing)", () => {
    const diff = computeMessageKeyDiff("os", { os: { a: 1 } }, {});
    expect(diff.ok).toBe(false);
    expect(diff.missing).toEqual(["os.a"]);
  });

  it("flattenMessageKeys handles nested objects", () => {
    expect(flattenMessageKeys({ a: { b: { c: "x" } }, d: "y" })).toEqual(
      expect.arrayContaining(["a.b.c", "d"]),
    );
  });
});

describe("LocalizationCore — real disk key-parity regression (apps/web/messages/*.json)", () => {
  const root = join(__dirname, "../../../");
  const messagesDir = join(root, "apps/web/messages");
  const locales: LocaleId[] = ["en", "fr", "de", "it", "pt"];

  function loadMessages(locale: LocaleId): Record<string, unknown> {
    const p = join(messagesDir, `${locale}.json`);
    expect(existsSync(p), p).toBe(true);
    return JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>;
  }

  const esMessages = loadMessages("es");

  it("CRITICAL_MESSAGE_NAMESPACES all exist in es.json (source of truth)", () => {
    for (const ns of CRITICAL_MESSAGE_NAMESPACES) {
      expect(esMessages[ns], `es.json missing namespace "${ns}"`).toBeTruthy();
    }
  });

  for (const locale of locales) {
    it(`${locale}.json has 100% key parity with es.json for every CRITICAL_MESSAGE_NAMESPACES entry`, () => {
      const localeMessages = loadMessages(locale);
      const diffs = computeCriticalMessageKeyDiffs(esMessages, localeMessages);
      const failing = diffs.filter((d) => !d.ok);
      expect(failing, JSON.stringify(failing, null, 2)).toEqual([]);
    });
  }

  it("FULL_VERIFIED classification in LOCALE_CATALOG is consistent with the real parity result above", () => {
    for (const locale of locales) {
      const localeMessages = loadMessages(locale);
      const diffs = computeCriticalMessageKeyDiffs(esMessages, localeMessages);
      const allOk = diffs.every((d) => d.ok);
      const catalogEntry = LOCALE_CATALOG.find((l) => l.id === locale);
      expect(catalogEntry).toBeDefined();
      if (allOk) {
        expect(catalogEntry!.coverage, `${locale} has full parity but is not marked FULL_VERIFIED`).toBe(
          "FULL_VERIFIED",
        );
      } else {
        expect(
          catalogEntry!.coverage,
          `${locale} has a real key-parity gap but is marked FULL_VERIFIED — downgrade to PARTIAL_NOT_AUDITED`,
        ).toBe("PARTIAL_NOT_AUDITED");
      }
    }
  });
});

describe("LocalizationCore — currency formatting regression per locale", () => {
  const cases: Array<{ locale: LocaleId; currency: "EUR" | "USD" | "GBP"; expectedSymbolPattern: RegExp }> = [
    { locale: "es", currency: "EUR", expectedSymbolPattern: /€/ },
    { locale: "en", currency: "USD", expectedSymbolPattern: /\$/ },
    { locale: "fr", currency: "EUR", expectedSymbolPattern: /€/ },
    { locale: "de", currency: "EUR", expectedSymbolPattern: /€/ },
    { locale: "it", currency: "EUR", expectedSymbolPattern: /€/ },
    { locale: "pt", currency: "EUR", expectedSymbolPattern: /€/ },
  ];

  for (const { locale, currency, expectedSymbolPattern } of cases) {
    it(`formats ${currency} for ${locale} with the correct currency symbol and no throw`, () => {
      const formatted = formatCurrency(1999.9, currency, locale);
      expect(formatted).toMatch(expectedSymbolPattern);
      expect(formatted).not.toBe("");
    });
  }

  it("rounds/formats consistently regardless of locale grouping style", () => {
    for (const locale of ["es", "en", "fr", "de", "it", "pt"] as LocaleId[]) {
      const formatted = formatCurrency(1000000, "EUR", locale);
      const digits = formatted.replace(/[^\d]/g, "");
      expect(digits).toContain("1000000");
    }
  });
});

describe("LocalizationCore — timezone formatting regression per locale", () => {
  const zones: Array<{ locale: LocaleId; timezone: string }> = [
    { locale: "es", timezone: "Europe/Madrid" },
    { locale: "en", timezone: "Etc/UTC" },
    { locale: "fr", timezone: "Europe/Paris" },
    { locale: "de", timezone: "Europe/Berlin" },
    { locale: "it", timezone: "Europe/Rome" },
    { locale: "pt", timezone: "Europe/Lisbon" },
  ];

  for (const { locale, timezone } of zones) {
    it(`formats a date in ${timezone} for locale ${locale} without throwing`, () => {
      const formatted = formatDateInTimezone(new Date("2026-03-10T12:00:00Z"), timezone, locale);
      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
    });
  }

  it("every catalog entry declares its default timezone as a real IANA zone usable by Intl", () => {
    for (const entry of LOCALE_CATALOG) {
      expect(() => new Intl.DateTimeFormat("en-US", { timeZone: entry.defaultTimezone })).not.toThrow();
    }
  });
});
