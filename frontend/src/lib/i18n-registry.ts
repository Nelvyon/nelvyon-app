/**
 * i18n Registry — Extensible translation system.
 * Add ANY language at runtime without touching view code.
 * 
 * Architecture:
 * - Translations are stored in a flat registry keyed by `${locale}.${namespace}.${key}`
 * - New languages can be registered via `registerLocale()` or `registerTranslations()`
 * - Views only call `tx(namespace, key)` — never reference a specific locale
 * - Fallback chain: requested locale → "en" → "es" → key itself
 */

export type LocaleCode = string; // e.g. "es", "en", "pt", "fr", "hi", "sw", "tr", etc.

export interface LocaleMeta {
  code: LocaleCode;
  name: string;       // Native name e.g. "Español"
  flag: string;       // Emoji flag e.g. "🇪🇸"
  dir?: "ltr" | "rtl"; // Text direction, default "ltr"
}

// ── Internal stores ──
const _locales = new Map<LocaleCode, LocaleMeta>();
const _translations = new Map<string, string>(); // key = "es.saas.loading"

// ── Pre-registered locales (10 built-in) ──
const BUILTIN_LOCALES: LocaleMeta[] = [
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "ar", name: "العربية", flag: "🇸🇦", dir: "rtl" },
];

BUILTIN_LOCALES.forEach((l) => _locales.set(l.code, l));

// ── Public API ──

/** Register a new locale (or update existing). */
export function registerLocale(meta: LocaleMeta) {
  _locales.set(meta.code, meta);
}

/** Bulk-register translations for a locale + namespace. */
export function registerTranslations(
  locale: LocaleCode,
  namespace: string,
  entries: Record<string, string>,
) {
  for (const [key, value] of Object.entries(entries)) {
    _translations.set(`${locale}.${namespace}.${key}`, value);
  }
}

/** Get a translation with fallback chain: locale → en → es → key */
export function getTranslation(
  locale: LocaleCode,
  namespace: string,
  key: string,
): string {
  return (
    _translations.get(`${locale}.${namespace}.${key}`) ||
    _translations.get(`en.${namespace}.${key}`) ||
    _translations.get(`es.${namespace}.${key}`) ||
    key
  );
}

/** List all registered locales */
export function getRegisteredLocales(): LocaleMeta[] {
  return Array.from(_locales.values());
}

/** Get locale metadata */
export function getLocaleMeta(code: LocaleCode): LocaleMeta | undefined {
  return _locales.get(code);
}

/** Check if a locale is registered */
export function isLocaleRegistered(code: LocaleCode): boolean {
  return _locales.has(code);
}

/** Get text direction for a locale */
export function getLocaleDir(code: LocaleCode): "ltr" | "rtl" {
  return _locales.get(code)?.dir ?? "ltr";
}

/**
 * Seed the registry from the existing static translation objects.
 * Called once at app boot from I18nProvider.
 */
export function seedFromStatic(
  namespace: string,
  data: Record<string, Record<string, string>>,
) {
  for (const [locale, entries] of Object.entries(data)) {
    registerTranslations(locale, namespace, entries);
  }
}