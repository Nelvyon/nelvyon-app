"use client";

import { useLocale } from "next-intl";

import { NelvyonDsButton } from "@/design-system/components";

type AppLocale = "es" | "en";

export function LanguageSelector() {
  const locale = (useLocale() === "en" ? "en" : "es") as AppLocale;

  function setLocale(nextLocale: AppLocale) {
    document.cookie = `NELVYON_LOCALE=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-2">
      <NelvyonDsButton
        type="button"
        size="sm"
        variant={locale === "es" ? "primary" : "secondary"}
        onClick={() => setLocale("es")}
      >
        ES
      </NelvyonDsButton>
      <NelvyonDsButton
        type="button"
        size="sm"
        variant={locale === "en" ? "primary" : "secondary"}
        onClick={() => setLocale("en")}
      >
        EN
      </NelvyonDsButton>
    </div>
  );
}
