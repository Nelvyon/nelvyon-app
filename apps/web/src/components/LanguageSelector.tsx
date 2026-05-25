"use client";

import { useLocale } from "next-intl";

import { NelvyonDsButton } from "@/design-system/components";
import { APP_LOCALES, LOCALE_FLAGS, LOCALE_LABELS, type AppLocale } from "../../i18n";

export function LanguageSelector() {
  const current = useLocale();
  const locale = (APP_LOCALES.includes(current as AppLocale) ? current : "es") as AppLocale;

  function setLocale(nextLocale: AppLocale) {
    document.cookie = `NELVYON_LOCALE=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {APP_LOCALES.map((code) => (
        <NelvyonDsButton
          key={code}
          type="button"
          size="sm"
          variant={locale === code ? "primary" : "secondary"}
          onClick={() => setLocale(code)}
          title={LOCALE_LABELS[code]}
        >
          {LOCALE_FLAGS[code]} {code.toUpperCase()}
        </NelvyonDsButton>
      ))}
    </div>
  );
}
