/**
 * useSaasI18n — convenience hook for SaaS pages.
 * Wraps useI18n().ts with a local dictionary fallback so pages that have
 * domain-specific strings (cybersecurity, PDF, presentations, etc.) can
 * call `s("key")` and get a translated string even if the key isn't in
 * the central i18n-saas registry yet.  Falls back to the key itself.
 *
 * Usage:
 *   const { s, locale } = useSaasI18n(localDict);
 *   <h1>{s("pageTitle")}</h1>
 */
import { useI18n, type Locale } from "./i18n";
import type { SaasTranslationKeys } from "./i18n-saas";

type Dict = Partial<Record<Locale, Record<string, string>>>;

export function useSaasI18n(localDict?: Dict) {
  const { ts, locale } = useI18n();

  /** Translate: tries central ts() first, then local dict, then key */
  const s = (key: string): string => {
    // 1. Try central SaaS translations
    const central = ts(key as SaasTranslationKeys);
    if (central !== key) return central;
    // 2. Try local dictionary
    if (localDict) {
      const localeDict = localDict[locale] ?? localDict.es;
      if (localeDict?.[key]) return localeDict[key];
    }
    // 3. Return key as-is
    return key;
  };

  return { s, locale, ts };
}