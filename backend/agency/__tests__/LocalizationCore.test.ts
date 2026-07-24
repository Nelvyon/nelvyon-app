import { describe, expect, it } from "vitest";
import {
  LOCALIZATION_FALLBACK_LOCALE,
  LOCALE_CATALOG,
  assertLocalizationCoreIntegrity,
  formatCurrency,
  formatDateInTimezone,
  getLocale,
  isSupportedLocale,
  listFullyVerifiedLocales,
  listLocales,
  listPartialLocales,
  resolveLocale,
  resolveTenantLocale,
} from "../LocalizationCore";

describe("LocalizationCore", () => {
  it("passes its own integrity assertion", () => {
    expect(assertLocalizationCoreIntegrity()).toEqual({ ok: true, violations: [] });
  });

  it("declares es and en as the only FULL_VERIFIED locales", () => {
    const full = listFullyVerifiedLocales().map((l) => l.id);
    expect(full.sort()).toEqual(["en", "es"]);
  });

  it("declares fr/de/it/pt as PARTIAL_NOT_AUDITED with an honest, non-trivial note", () => {
    const partial = listPartialLocales();
    expect(partial.map((l) => l.id).sort()).toEqual(["de", "fr", "it", "pt"]);
    for (const p of partial) {
      expect(p.coverageNote.length).toBeGreaterThan(20);
      expect(p.coverageNote.toLowerCase()).toContain("not audited");
    }
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
